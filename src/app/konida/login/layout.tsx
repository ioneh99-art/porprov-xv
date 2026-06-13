// Layout khusus login — override parent KonidaLayout, tidak ada sidebar
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
