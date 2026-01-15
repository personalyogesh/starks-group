"use client";

import { useEffect, useState } from "react";
import { listenCollection, EventDoc, LinkDoc, PostDoc, toggleLike, setRsvp } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import { RequireApproved } from "@/components/RequireApproved";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export default function HomePage() {
  const { user, userDoc } = useAuth();

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);

  useEffect(() => listenCollection<EventDoc>("events", setEvents), []);
  useEffect(() => listenCollection<LinkDoc>("links", setLinks), []);
  useEffect(() => listenCollection<PostDoc>("posts", setPosts), []);

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <h1>Starks Group</h1>

      {/* EVENTS */}
      <section>
        <h2>Events</h2>
        {events.length === 0 && <p>No events yet.</p>}
        {events.map(({ id, data }) => (
          <div key={id} style={card}>
            <strong>{data.title}</strong>
            <div style={muted}>
              {new Date(data.dateTime).toLocaleString()} • {data.location}
            </div>
            {data.description && <p>{data.description}</p>}

            <RequireApproved>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setRsvp(id, user!.uid, "going")}>Going</button>
                <button onClick={() => setRsvp(id, user!.uid, "interested")}>Interested</button>
              </div>
            </RequireApproved>
          </div>
        ))}
      </section>

      {/* LINKS */}
      <section>
        <h2>External Links</h2>
        <ul>
          {links.length === 0 && <li>No links yet.</li>}
          {links.map(({ id, data }) => (
            <li key={id}>
              <a href={data.url} target="_blank" rel="noreferrer">
                {data.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* POSTS */}
      <section>
        <h2>Posts</h2>
        {posts.length === 0 && <p>No posts yet.</p>}
        {posts.map(({ id, data }) => (
          <PostCard
            key={id}
            postId={id}
            title={data.title}
            body={data.body}
            uid={user?.uid}
            canInteract={userDoc?.status === "approved"}
          />
        ))}
      </section>
    </div>
  );
}

function PostCard({
  postId,
  title,
  body,
  uid,
  canInteract,
}: {
  postId: string;
  title: string;
  body: string;
  uid?: string;
  canInteract?: boolean;
}) {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "posts", postId, "likes", uid);
    return onSnapshot(ref, (snap) => setLiked(snap.exists()));
  }, [postId, uid]);

  return (
    <div style={card}>
      <strong>{title}</strong>
      <p>{body}</p>

      <RequireApproved>
        <button disabled={!canInteract} onClick={() => toggleLike(postId, uid!, !liked)}>
          {liked ? "Unlike" : "Like"}
        </button>
      </RequireApproved>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: 12,
};

const muted: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
};
