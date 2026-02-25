type SkillRating = { skill: string; rating: number };

export default function SkillRatingsDisplay({ skillRatings }: { skillRatings: unknown }) {
  if (!skillRatings || !Array.isArray(skillRatings) || skillRatings.length === 0) return null;
  const ratings = skillRatings as SkillRating[];
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {ratings.map((sr, i) => (
        <span key={i} className="text-sm text-foreground-secondary">
          <span className="font-medium">{sr.skill}:</span>{" "}
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= sr.rating ? "text-yellow-500" : "text-gray-300"}>★</span>
          ))}
        </span>
      ))}
    </div>
  );
}
