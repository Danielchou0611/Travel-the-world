export function Card({ children, className = "" }) {
  return <section className={`ui-card ${className}`.trim()}>{children}</section>;
}

export function CardHeader({ children }) {
  return <header className="ui-card__header">{children}</header>;
}

export function CardTitle({ children }) {
  return <h3 className="ui-card__title">{children}</h3>;
}

export function CardDescription({ children }) {
  return <p className="ui-card__description">{children}</p>;
}

export function CardContent({ children }) {
  return <div className="ui-card__content">{children}</div>;
}

export function CardFooter({ children }) {
  return <footer className="ui-card__footer">{children}</footer>;
}

