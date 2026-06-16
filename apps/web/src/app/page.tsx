import Link from "next/link";
import { ArrowRight, GraduationCap, LayoutDashboard } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-foreground">
            Bambu Farm
          </h1>
          <p className="max-w-[600px] text-muted-foreground md:text-xl">
            校园集中式 3D 打印管理系统
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl w-full">
          {/* Student Portal Card */}
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <GraduationCap className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-2xl">学生门户</CardTitle>
              <CardDescription>
                上传模型并跟踪打印状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student">
                <Button className="w-full group-hover:bg-primary/90">
                  进入门户 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Teacher Cockpit Card */}
          <Card className="hover:border-secondary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <LayoutDashboard className="h-10 w-10 text-secondary mb-2" />
              <CardTitle className="text-2xl">教师控制台</CardTitle>
              <CardDescription>
                管理打印机、审核任务并监控队列
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/teacher">
                <Button variant="secondary" className="w-full">
                  进入控制台 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © 2026 Bambu Farm 项目。仅限内部使用。
      </footer>
    </div>
  );
}
