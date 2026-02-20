
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StekUser } from '@/hooks/useStekFinder';
import { UploadCloud, X, FileImage } from 'lucide-react';

interface StekFinderInputProps {
    onSearch: (file: File | null) => void;
    isLoading: boolean;
    loadingStep?: string;
    onClear: () => void;
    user: StekUser;
    credits: number;
    shouldHighlight: boolean;
}

const StekFinderInput = ({ onSearch, isLoading, loadingStep, onClear, user, credits, shouldHighlight }: StekFinderInputProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            setFile(selectedFile);
        } else {
            setFile(null);
        }
    };

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvent(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleClearFile = () => {
        setFile(null);
        onClear();
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Card className={cn("bg-black/20 border-white/10 text-white transition-all duration-500", shouldHighlight && "border-sky-400 border-2 shadow-lg shadow-sky-400/20")}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upload je visfoto</CardTitle>
                <div className="text-sm text-white/70">
                    Welkom, {user.name}! Credits: <span className="font-bold text-sky-400">{credits}</span>
                </div>
            </CardHeader>
            <CardContent>
                {file ? (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <FileImage className="h-8 w-8 text-sky-400" />
                            <div>
                                <p className="font-semibold">{file.name}</p>
                                <p className="text-xs text-white/60">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleClearFile} className="text-white/70 hover:text-white hover:bg-red-500/20">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                ) : (
                    <div
                        className={cn(
                            "border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer transition-colors",
                            isDragging ? "bg-sky-900/50 border-sky-400" : "hover:border-white/40"
                        )}
                        onDragEnter={(e) => handleDragEvent(e, true)}
                        onDragLeave={(e) => handleDragEvent(e, false)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                        />
                        <UploadCloud className="h-12 w-12 mx-auto text-white/50 mb-3" />
                        <p className="font-semibold">Sleep je foto hierheen</p>
                        <p className="text-sm text-white/60">of klik om te selecteren</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={() => onSearch(file)}
                    disabled={!file || isLoading}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold"
                    size="lg"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            {loadingStep || 'Analyseren...'}
                        </>
                    ) : 'Vind de Stek!'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default StekFinderInput;
