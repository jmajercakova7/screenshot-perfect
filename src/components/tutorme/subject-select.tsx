import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS, SUBJECT_GROUPS } from "@/lib/subjects";

export function SubjectSelect({
  value,
  onChange,
  placeholder = "Choose a subject",
  only,
  className,
  id,
}: {
  value?: string | undefined;
  onChange: (slug: string) => void;
  placeholder?: string;
  only?: string[];
  className?: string;
  id?: string;
}) {
  const list = only ? SUBJECTS.filter((s) => only.includes(s.slug)) : SUBJECTS;
  const groups = SUBJECT_GROUPS.filter((g) => list.some((s) => s.group === g));
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>{g}</SelectLabel>
            {list
              .filter((s) => s.group === g)
              .map((s) => (
                <SelectItem key={s.slug} value={s.slug}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
