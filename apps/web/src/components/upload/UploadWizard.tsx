"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Cpu, Loader2, UploadCloud } from "lucide-react";

import { uploadJob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UploadWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState("PLA");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { title: "上传模型", description: "选择或拖拽 .3mf 文件" },
    { title: "配置属性", description: "选择耗材及添加备注" },
    { title: "确认信息", description: "检查信息并提交任务" },
  ];
  const stepInfo = steps[step - 1] ?? steps[0];

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      units.length - 1,
      Math.floor(Math.log(bytes) / Math.log(1024))
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const [selected] = acceptedFiles;
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".3mf")) {
      setFile(null);
      setError("仅支持 .3mf 文件");
      return;
    }
    setFile(selected);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const handleNext = async () => {
      if (step === 3) {
          if (!file) return;
          setIsSubmitting(true);
          setError(null);
          try {
              await uploadJob(file, material, note);
              // Success!
              onClose(); 
          } catch (uploadError) {
              console.error(uploadError);
              const message =
                uploadError instanceof Error ? uploadError.message : "提交失败";
              setError(message);
              setIsSubmitting(false);
          }
      } else {
          setError(null);
          setStep(s => s + 1);
      }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6 md:p-8 min-h-[400px] flex flex-col justify-between border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            第 {step} 步 / 共 3 步
          </div>
          <h2 className="text-xl font-semibold">{stepInfo.title}</h2>
          <p className="text-sm text-muted-foreground">{stepInfo.description}</p>
          <div className="flex gap-2 pt-2">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center space-y-4"
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "rounded-lg border-2 border-dashed border-border/70 p-8 text-center cursor-pointer transition-colors",
                    isDragActive && "border-primary bg-primary/5"
                  )}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    {isDragActive ? "松开即可上传" : "拖拽 .3mf 文件到这里，或点击选择"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    仅支持 .3mf 格式
                  </p>
                </div>

                {file && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <span className="truncate">已选择：{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center space-y-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["PLA", "PETG", "ABS", "TPU"].map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      onClick={() => setMaterial(option)}
                      className={cn(
                        "h-11",
                        material === option &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="note-input" className="text-xs font-semibold text-muted-foreground block">
                    备注信息 (可选)
                  </label>
                  <textarea
                    id="note-input"
                    placeholder="例如：层高 0.2mm，填充率 20%，需要支撑强度较高..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-20 p-2.5 rounded-md border border-border/50 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60 font-sans"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  已选择文件：{file ? file.name : "未选择"}
                </div>
              </motion.div>
            )}
            
            {/* STEP 3: REVIEW */}
            {step === 3 && (
                <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-2"
                >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Cpu className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold">确认提交信息</h3>
                        <p className="text-muted-foreground text-xs max-w-md">
                            任务提交后将进入 **教师审核队列**，审核通过后系统将自动分发打印。
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="w-full max-w-md bg-muted/30 rounded-lg p-4 text-xs space-y-2 text-left border">
                         <div className="flex justify-between border-b border-border/50 pb-2">
                            <span className="text-muted-foreground">文件名</span>
                            <span className="font-medium truncate max-w-[240px]" title={file?.name}>{file?.name}</span>
                        </div>
                         <div className="flex justify-between border-b border-border/50 pb-2">
                            <span className="text-muted-foreground">所选材料</span>
                            <span className="font-mono font-bold text-primary">{material}</span>
                        </div>
                         <div className="flex flex-col gap-1 pt-1">
                            <span className="text-muted-foreground">备注信息</span>
                            <span className="bg-background/40 p-2 rounded border border-border/20 text-foreground break-all min-h-[40px] block font-sans">
                              {note || "无备注"}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
            {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
                </Button>
            ) : (
                <div /> // Spacer
            )}
            
            <Button 
                onClick={handleNext} 
                disabled={(step === 1 && !file) || isSubmitting}
                className={cn("px-8", step === 3 && "bg-green-600 hover:bg-green-700")}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在提交...
                    </>
                ) : (
                    <>
                        {step === 3 ? "提交审核" : "下一步"}
                        {step !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
                    </>
                )}
            </Button>
        </div>
      </Card>
    </div>
  );
}
