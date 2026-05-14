const variantClassMap = {
  primary: "ui-btn--primary",
  secondary: "ui-btn--secondary",
  ghost: "ui-btn--ghost",
};

const sizeClassMap = {
  sm: "ui-btn--sm",
  md: "ui-btn--md",
  lg: "ui-btn--lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}) {
  const variantClass = variantClassMap[variant] || variantClassMap.primary;
  const sizeClass = sizeClassMap[size] || sizeClassMap.md;

  return (
    <button className={`ui-btn ${variantClass} ${sizeClass}`} type={type} {...props}>
      {children}
    </button>
  );
}

