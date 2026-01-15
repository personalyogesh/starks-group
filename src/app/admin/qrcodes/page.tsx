"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/components/AuthProvider";
import { listenCollection, createPost, deletePost, PostDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";

export default function AdminPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => listenCollection<PostDoc>("posts", setPosts), []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await createPost(user.uid, { title, body });
    setTitle(""); setBody("");
  }

  return (
    <RequireAdmin>
      <h1>Manage Posts</h1>

      <form onSubmit={add} style={{ display: "grid", gap: 10, maxWidth: 640, marginTop: 10 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} required />
        <button type="submit">Add Post</button>
      </form>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {posts.map(({ id, data }) => (
          <div key={id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{data.title}</div>
            <p style={{ marginTop: 8 }}>{data.body}</p>
            <button style={{ marginTop: 10 }} onClick={() => deletePost(id)}>Delete</button>
          </div>
        ))}
      </div>
    </RequireAdmin>
  );
}
