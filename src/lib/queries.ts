import { queryOptions } from "@tanstack/react-query";
import { getTutor, listTutors } from "./tutors.functions";

export const tutorsQuery = () =>
  queryOptions({ queryKey: ["tutors"], queryFn: () => listTutors(), staleTime: 60_000 });

export const tutorQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tutor", slug],
    queryFn: () => getTutor({ data: { slug } }),
    staleTime: 60_000,
  });
