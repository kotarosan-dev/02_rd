"use client";

import Image from "next/image";

interface BlogPostProps {
  post: {
    title: string;
    content: string;
    date: string;
    category: string;
    imageUrl: string;
  };
}

export function BlogPost({ post }: BlogPostProps) {
  return (
    <article className="container mx-auto px-4 max-w-4xl">
      <div className="relative h-[400px] mb-8 rounded-lg overflow-hidden">
        <Image
          src={post.imageUrl}
          alt={post.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{post.date}</span>
          <span>{post.category}</span>
        </div>
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <div className="prose prose-lg max-w-none">
          {post.content.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}