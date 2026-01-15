"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/components/AuthProvider";
import { listenCollection, createLink, deleteLink, LinkDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";

export default function AdminLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => listenCollection<LinkDoc>("links", setLinks), []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await createLink(user.uid, { title, url });
    setTitle(""); setUrl("");
  }

  return (
    <RequireAdmin>
      <h1>Manage Links</h1>

      <form onSubmit={add} style={{ display: "grid", gap: 10, maxWidth: 640, marginTop: 10 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button type="submit">Add Link</button>
      </form>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {links.map(({ id, data }) => (
          <div key={id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{data.title}</div>
            <a href={data.url} target="_blank" rel="noreferrer">{data.url}</a>
            <button style={{ marginTop: 10 }} onClick={() => deleteLink(id)}>Delete</button>
          </div>
        ))}
      </div>
    </RequireAdmin>
  );
}
