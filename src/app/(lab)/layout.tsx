import "./lab.css";

/** The dashboard's own full-screen look (dark, cinematic). Separate from the classic list layout. */
export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="lab">{children}</div>;
}
