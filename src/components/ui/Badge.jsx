const variantClassMap = {
  neutral: "ui-badge--neutral",
  success: "ui-badge--success",
  warning: "ui-badge--warning",
  info: "ui-badge--info",
};

export default function Badge({ children, variant = "neutral" }) {
  const variantClass = variantClassMap[variant] || variantClassMap.neutral;
  return <span className={`ui-badge ${variantClass}`}>{children}</span>;
}

