import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onFileUpload?: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
}

export default function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  maxSize = 10,
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a file with one of these extensions: ${acceptedTypes.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('/api/schedules/upload', {
        method: 'POST',
        body: formData
      });

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} has been processed and schedules have been imported.`
      });

      if (onFileUpload) {
        onFileUpload(file);
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-lg font-medium">Uploading...</p>
            <p className="text-muted-foreground">Processing your schedule file</p>
          </div>
        ) : (
          <div className="space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium mb-2">Drop your schedule file here</p>
              <p className="text-muted-foreground mb-4">
                or click to browse ({acceptedTypes.join(', ')} files, max {maxSize}MB)
              </p>
            </div>
            <Button variant="outline" onClick={openFileDialog}>
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Expected Format:</p>
            <p>CSV/Excel file with columns: Subject, Classroom, Day, Start Time, End Time, Auto Start</p>
          </div>
        </div>
      </div>
    </div>
  );
}