type Member = { id: string; name: string; avatar_color: string };

type MemberAvatarStackProps = {
  members: Member[];
  size?: "sm" | "md"; // default 'md'
};

export default function MemberAvatarStack({ members, size = "md" }: MemberAvatarStackProps) {
  const dim = size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";

  return (
    <div className="flex items-center">
      {members.map((m, i) => (
        <div
          key={m.id}
          // Avatar colors come from dynamic user data — inline backgroundColor
          // is the documented exception to no-inline-styles per D8 (same pattern as SlotCard).
          style={{ backgroundColor: m.avatar_color }}
          className={`${dim} rounded-full flex items-center justify-center font-sans font-semibold text-white border-2 border-wash${i > 0 ? " -ml-2" : ""}`}
          title={m.name}
          aria-label={m.name}
        >
          {m.name[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}
