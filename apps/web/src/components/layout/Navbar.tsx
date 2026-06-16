import Link from "next/link"
import { Printer } from "lucide-react"

export function Navbar() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="rounded bg-primary p-1">
            <Printer className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-lg tracking-tight">Bambu Farm</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">校园 3D 打印服务</span>
        </div>
      </div>
    </header>
  )
}
