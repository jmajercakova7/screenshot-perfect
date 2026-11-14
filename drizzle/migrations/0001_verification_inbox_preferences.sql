-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Learner preferences
ALTER TABLE public.profiles ADD COLUMN lesson_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Tutors: link to real accounts + verification status
ALTER TABLE public.tutors ADD COLUMN user_id uuid UNIQUE;
ALTER TABLE public.tutors ADD COLUMN verification_status text NOT NULL DEFAULT 'not_started'
  CHECK (verification_status IN ('not_started','in_review','action_needed','verified'));
UPDATE public.tutors SET verification_status = CASE WHEN verified THEN 'verified' ELSE 'in_review' END;

ALTER TABLE public.tutors ADD CONSTRAINT tutors_text_limits CHECK (
  char_length(slug) BETWEEN 3 AND 80 AND char_length(full_name) BETWEEN 2 AND 100
  AND char_length(headline) BETWEEN 5 AND 140 AND char_length(bio) BETWEEN 20 AND 1500
  AND char_length(country) BETWEEN 2 AND 60 AND char_length(timezone) BETWEEN 2 AND 20
  AND cardinality(subjects) BETWEEN 1 AND 10 AND cardinality(languages) BETWEEN 1 AND 8
  AND price_per_hour <= 500
);

GRANT INSERT (slug, full_name, headline, bio, country, timezone, languages, subjects, price_per_hour, user_id) ON public.tutors TO authenticated;
GRANT UPDATE (full_name, headline, bio, country, timezone, languages, subjects, price_per_hour) ON public.tutors TO authenticated;
CREATE POLICY "Tutors create own listing" ON public.tutors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tutors update own listing" ON public.tutors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verification documents
CREATE TABLE public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  doc_type text NOT NULL CHECK (doc_type IN ('identity','qualification','background_check')),
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_note text CHECK (reviewer_note IS NULL OR char_length(reviewer_note) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_documents_user_idx ON public.verification_documents(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.verification_documents TO authenticated;
GRANT UPDATE (status, reviewer_note) ON public.verification_documents TO authenticated;
GRANT ALL ON public.verification_documents TO service_role;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own documents" ON public.verification_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners upload own documents" ON public.verification_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewer_note IS NULL AND reviewed_by IS NULL
              AND reviewed_at IS NULL AND file_path LIKE auth.uid()::text || '/%');
CREATE POLICY "Owners delete pending documents" ON public.verification_documents FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins read all documents" ON public.verification_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins review documents" ON public.verification_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.stamp_document_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewer_note IS DISTINCT FROM OLD.reviewer_note THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER verification_documents_stamp BEFORE UPDATE ON public.verification_documents FOR EACH ROW EXECUTE FUNCTION public.stamp_document_review();

-- Recompute a tutor's public verification status from their latest document of each type
CREATE OR REPLACE FUNCTION public.refresh_tutor_verification(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _status text;
  _labels text[];
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON (doc_type) doc_type, status
    FROM public.verification_documents WHERE user_id = _user_id
    ORDER BY doc_type, created_at DESC
  )
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM latest) THEN 'not_started'
      WHEN EXISTS (SELECT 1 FROM latest WHERE status = 'rejected') THEN 'action_needed'
      WHEN (SELECT count(*) FROM latest WHERE doc_type IN ('identity','qualification') AND status = 'approved') = 2 THEN 'verified'
      ELSE 'in_review'
    END,
    COALESCE((SELECT array_agg(CASE doc_type WHEN 'identity' THEN 'Identity' WHEN 'qualification' THEN 'Qualifications' ELSE 'Background check' END ORDER BY doc_type DESC)
              FROM latest WHERE status = 'approved'), '{}')
  INTO _status, _labels;

  UPDATE public.tutors
  SET verification_status = _status, verified = (_status = 'verified'), verifications = _labels
  WHERE user_id = _user_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.refresh_tutor_verification(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_verification_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_tutor_verification(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER verification_documents_refresh AFTER INSERT OR UPDATE OR DELETE ON public.verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.on_verification_document_change();

CREATE OR REPLACE FUNCTION public.on_tutor_listing_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN PERFORM public.refresh_tutor_verification(NEW.user_id); END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER tutors_refresh_verification AFTER INSERT ON public.tutors FOR EACH ROW EXECUTE FUNCTION public.on_tutor_listing_created();

-- Admins can see tutor names when reviewing
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lesson requests: tutor inbox
ALTER TABLE public.lesson_requests ADD COLUMN tutor_reply text CHECK (tutor_reply IS NULL OR char_length(tutor_reply) <= 500);
ALTER TABLE public.lesson_requests ADD COLUMN responded_at timestamptz;
CREATE INDEX lesson_requests_tutor_idx ON public.lesson_requests(tutor_id, created_at DESC);

REVOKE UPDATE ON public.lesson_requests FROM authenticated;
GRANT UPDATE (status, tutor_reply) ON public.lesson_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.is_tutor_owner(_tutor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tutors WHERE id = _tutor_id AND user_id = auth.uid())
$$;

CREATE POLICY "Tutors read requests sent to them" ON public.lesson_requests FOR SELECT TO authenticated USING (public.is_tutor_owner(tutor_id));
CREATE POLICY "Tutors respond to requests" ON public.lesson_requests FOR UPDATE TO authenticated
  USING (public.is_tutor_owner(tutor_id)) WITH CHECK (public.is_tutor_owner(tutor_id) AND status IN ('pending','accepted','declined'));

CREATE OR REPLACE FUNCTION public.guard_lesson_request_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _is_tutor boolean := public.is_tutor_owner(OLD.tutor_id);
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF _is_tutor AND OLD.status = 'pending' AND NEW.status IN ('accepted','declined') THEN
      NEW.responded_at := now();
    ELSIF auth.uid() = OLD.learner_id AND OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'This request can no longer be changed';
    END IF;
  END IF;
  IF NEW.tutor_reply IS DISTINCT FROM OLD.tutor_reply AND NOT _is_tutor THEN
    RAISE EXCEPTION 'Only the tutor can reply';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER lesson_requests_guard BEFORE UPDATE ON public.lesson_requests FOR EACH ROW EXECUTE FUNCTION public.guard_lesson_request_update();

-- Tutors can see the name of learners who sent them requests
CREATE OR REPLACE FUNCTION public.learner_requested_me(_learner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_requests r JOIN public.tutors t ON t.id = r.tutor_id
    WHERE r.learner_id = _learner_id AND t.user_id = auth.uid()
  )
$$;
CREATE POLICY "Tutors read profiles of their learners" ON public.profiles FOR SELECT TO authenticated USING (public.learner_requested_me(id));

-- Storage policies for the private verification bucket
CREATE POLICY "Owners upload verification files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners read verification files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete verification files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins read verification files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-documents' AND public.has_role(auth.uid(), 'admin'));