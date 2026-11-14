-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 100),
  account_type text NOT NULL DEFAULT 'learner' CHECK (account_type IN ('learner','tutor')),
  main_subject text CHECK (main_subject IS NULL OR char_length(main_subject) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _type text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'learner');
BEGIN
  IF _type NOT IN ('learner','tutor') THEN _type := 'learner'; END IF;
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    left(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 100),
    _type
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tutors (public directory)
CREATE TABLE public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  full_name text NOT NULL,
  headline text NOT NULL,
  bio text NOT NULL,
  country text NOT NULL,
  timezone text NOT NULL,
  languages text[] NOT NULL DEFAULT '{}',
  subjects text[] NOT NULL DEFAULT '{}',
  price_per_hour integer NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0),
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  review_count integer NOT NULL DEFAULT 0,
  lessons_taught integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  verifications text[] NOT NULL DEFAULT '{}',
  response_time text NOT NULL DEFAULT 'within a day',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tutors TO anon, authenticated;
GRANT ALL ON public.tutors TO service_role;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tutors" ON public.tutors FOR SELECT TO anon, authenticated USING (true);

-- Lesson requests
CREATE TABLE public.lesson_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL DEFAULT auth.uid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  goal text NOT NULL CHECK (char_length(goal) BETWEEN 1 AND 1000),
  preferred_times text NOT NULL DEFAULT '' CHECK (char_length(preferred_times) <= 200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_requests_learner_idx ON public.lesson_requests(learner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.lesson_requests TO authenticated;
GRANT ALL ON public.lesson_requests TO service_role;
ALTER TABLE public.lesson_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners read own requests" ON public.lesson_requests FOR SELECT TO authenticated USING (auth.uid() = learner_id);
CREATE POLICY "Learners create own requests" ON public.lesson_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = learner_id AND status = 'pending');
CREATE POLICY "Learners cancel own requests" ON public.lesson_requests FOR UPDATE TO authenticated USING (auth.uid() = learner_id) WITH CHECK (auth.uid() = learner_id AND status IN ('pending','cancelled'));

-- Sample tutors
INSERT INTO public.tutors (slug, full_name, headline, bio, country, timezone, languages, subjects, price_per_hour, rating, review_count, lessons_taught, verified, verifications, response_time) VALUES
('amara-okafor','Amara Okafor','IB Maths AA HL specialist · former IB examiner','I studied Mathematics at the University of Cape Town and marked IB Maths papers for four years. I help students turn calculus and proof questions from scary into satisfying, with plenty of past-paper practice.','South Africa','GMT+2',ARRAY['English','Igbo'],ARRAY['ib-math-aa-hl','ib-math-aa-sl','ib-physics-hl'],35,4.9,128,612,true,ARRAY['Identity','University degree','IB examiner'],'within 2 hours'),
('lukas-weber','Lukas Weber','Engineering student volunteering for IB Maths','Third-year engineering student at ETH Zürich. I scored a 7 in Maths AA HL and volunteer a few hours each week because a free tutor once changed everything for me.','Switzerland','GMT+1',ARRAY['German','English'],ARRAY['ib-math-aa-hl','ib-physics-hl','python'],0,4.8,41,96,true,ARRAY['Identity','Student ID'],'within a day'),
('priya-raman','Priya Raman','Patient maths tutor for IB and SAT','Ten years of teaching maths in Bangalore and online. I focus on understanding first, then exam technique. Many of my students go from a 4 to a 6 in one term.','India','GMT+5:30',ARRAY['English','Hindi','Tamil'],ARRAY['ib-math-aa-hl','ib-math-ai-sl','sat-math'],22,4.9,203,1340,true,ARRAY['Identity','Teaching licence','University degree'],'within 4 hours'),
('mateo-alvarez','Mateo Álvarez','Spanish and IB Economics, explained simply','Economist from Buenos Aires who loves languages. I teach conversational Spanish and IB Economics with real-world news examples.','Argentina','GMT-3',ARRAY['Spanish','English'],ARRAY['spanish','ib-economics-hl'],18,4.7,77,388,true,ARRAY['Identity','University degree'],'within a day'),
('grace-nambala','Grace Nambala','Free English and Biology help for learners everywhere','Biology graduate from the University of Namibia. I volunteer to help learners with English writing and IB Biology, especially those preparing for scholarships.','Namibia','GMT+2',ARRAY['English','Oshiwambo'],ARRAY['ib-biology-hl','esl','ib-english-a'],0,5.0,36,82,true,ARRAY['Identity','University degree'],'within 6 hours'),
('hannah-cho','Hannah Cho','Chemistry made visual','PhD candidate in Chemistry at Seoul National University. I use diagrams and simple models to make IB and A-Level Chemistry click.','South Korea','GMT+9',ARRAY['Korean','English'],ARRAY['ib-chemistry-hl','a-level-chemistry'],30,4.8,94,455,true,ARRAY['Identity','University degree'],'within 3 hours'),
('james-whitaker','James Whitaker','English Literature and essay coaching','Former secondary school English teacher in London. I coach IB English A and help with essays, personal statements and extended essays.','United Kingdom','GMT+0',ARRAY['English','French'],ARRAY['ib-english-a','esl'],40,4.9,156,890,true,ARRAY['Identity','Teaching licence','Background check'],'within 2 hours'),
('sofia-rossi','Sofia Rossi','Python and computer science for beginners','Software engineer in Milan. I volunteer on weekends teaching programming from zero, with small projects you can actually show off.','Italy','GMT+1',ARRAY['Italian','English'],ARRAY['python'],0,4.9,58,140,true,ARRAY['Identity'],'within a day'),
('daniel-mensah','Daniel Mensah','Physics and maths with a smile','Physics teacher in Accra. I break problems into small steps and build confidence for IB Physics and Maths exams.','Ghana','GMT+0',ARRAY['English','Twi'],ARRAY['ib-physics-hl','ib-math-aa-sl','gcse-maths'],15,4.8,67,301,true,ARRAY['Identity','Teaching licence'],'within 5 hours'),
('elena-petrova','Elena Petrova','Maths olympiad coach for ambitious students','Mathematics olympiad coach from Sofia. Ideal for students aiming for a 7 in Maths AA HL who want harder problems and deeper reasoning.','Bulgaria','GMT+2',ARRAY['Bulgarian','English','Russian'],ARRAY['ib-math-aa-hl','sat-math'],45,5.0,88,520,false,ARRAY['Identity'],'within a day');