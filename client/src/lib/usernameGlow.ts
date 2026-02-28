export function getGlowStyle(usernameGlow: string | null | undefined): React.CSSProperties | undefined {
  if (!usernameGlow || usernameGlow === "purple") return undefined;
  const colors = usernameGlow.split(",").map(c => c.trim());
  if (colors.length >= 2) {
    return {
      background: `linear-gradient(135deg, ${colors.join(", ")})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      fontWeight: 700,
    };
  }
  if (colors.length === 1 && colors[0].startsWith("#")) {
    return {
      color: colors[0],
      fontWeight: 700,
    };
  }
  return undefined;
}

export function hasCustomGlow(usernameGlow: string | null | undefined): boolean {
  return !!usernameGlow && usernameGlow !== "purple";
}
