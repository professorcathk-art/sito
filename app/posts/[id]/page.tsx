import { redirect } from "next/navigation";

interface PostsAliasProps {
  params: Promise<{ id: string }>;
}

/** Friendly alias → canonical /blog/[id] */
export default async function PostsAliasPage({ params }: PostsAliasProps) {
  const { id } = await params;
  redirect(`/blog/${id}`);
}
