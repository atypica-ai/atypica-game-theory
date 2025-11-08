"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clientUploadFileToS3 } from "@/lib/attachments/client";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { cn } from "@/lib/utils";
import { ChatMessageAttachment } from "@/prisma/client";
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface QuestionData {
  text: string;
  image?: ChatMessageAttachment;
  questionType?: "open" | "single-choice" | "multiple-choice";
}

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionData | null;
  onSave: (question: QuestionData) => void;
  questionIndex?: number;
}

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onSave,
  questionIndex,
}: EditQuestionDialogProps) {
  const t = useTranslations("InterviewProject.editQuestion");

  const [text, setText] = useState("");
  const [image, setImage] = useState<ChatMessageAttachment | undefined>();
  const [questionType, setQuestionType] = useState<"open" | "single-choice" | "multiple-choice">(
    "open",
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialize form when question changes
  useEffect(() => {
    if (question) {
      setText(question.text);
      setImage(question.image);
      setQuestionType(question.questionType || "open");
    } else {
      setText("");
      setImage(undefined);
      setQuestionType("open");
    }
  }, [question]);

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("invalidImageType"));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("imageTooLarge"));
      return;
    }

    setUploadingImage(true);

    try {
      const { objectUrl } = await clientUploadFileToS3(file);

      // Save as ChatMessageAttachment format
      setImage({
        objectUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      toast.success(t("imageUploaded"));
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error(t("imageUploadFailed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = () => {
    setImage(undefined);
  };

  const handleSave = useCallback(() => {
    if (!text.trim()) {
      toast.error(t("questionTextRequired"));
      return;
    }

    onSave({
      text: text.trim(),
      image,
      questionType,
    });

    onOpenChange(false);
  }, [text, image, questionType, onSave, onOpenChange, t]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {questionIndex !== undefined ? `${t("title")} #${questionIndex + 1}` : t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="questionText" className="text-sm font-medium">
              {t("questionText")}
            </Label>
            <Textarea
              id="questionText"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("questionTextPlaceholder")}
              className="min-h-24"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("questionImage")} ({t("optional")})
            </Label>

            {!image ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="image-upload"
                  className={cn(
                    "cursor-pointer flex flex-col items-center gap-2",
                    uploadingImage && "opacity-50 pointer-events-none",
                  )}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2Icon className="h-8 w-8 text-muted-foreground animate-spin" />
                      <span className="text-sm text-muted-foreground">{t("uploading")}</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">{t("uploadImage")}</span>
                      <span className="text-xs text-muted-foreground">{t("supportedFormats")}</span>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={proxiedObjectCdnUrl({
                        name: image.name,
                        objectUrl: image.objectUrl,
                        mimeType: image.mimeType,
                      })}
                      alt="Question"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(image.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        proxiedObjectCdnUrl({
                          name: image.name,
                          objectUrl: image.objectUrl,
                          mimeType: image.mimeType,
                        }),
                        "_blank",
                      )
                    }
                    className="gap-1 flex-1"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {t("preview")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteImage}
                    className="gap-1 flex-1 text-destructive hover:text-destructive"
                  >
                    <XIcon className="h-3 w-3" />
                    {t("delete")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("questionType")}</Label>
            <RadioGroup
              value={questionType}
              onValueChange={(value) =>
                setQuestionType(value as "open" | "single-choice" | "multiple-choice")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="type-open" />
                <Label htmlFor="type-open" className="font-normal">
                  {t("openQuestion")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single-choice" id="type-single" />
                <Label htmlFor="type-single" className="font-normal">
                  {t("singleChoiceQuestion")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple-choice" id="type-multiple" />
                <Label htmlFor="type-multiple" className="font-normal">
                  {t("multipleChoiceQuestion")}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
