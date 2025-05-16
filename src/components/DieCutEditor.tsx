
import { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loadImage, removeBackground } from '@/utils/backgroundRemoval';
import { generateDieCutOutline } from '@/utils/dieCutUtils';
import ImageUploader from '@/components/ImageUploader';
import { ArrowRight, Crop, Square } from 'lucide-react';
import { toast } from 'sonner';

const DieCutEditor = () => {
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageObject, setImageObject] = useState<fabric.Image | null>(null);
  const [dieCutObject, setDieCutObject] = useState<fabric.Object | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bleed, setBleed] = useState(10);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Initialize fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvas) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: bgColor,
      });
      
      setFabricCanvas(canvas);
      
      // Cleanup
      return () => {
        canvas.dispose();
      };
    }
  }, [fabricCanvas]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fabricCanvas && canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        const containerWidth = container.clientWidth;
        
        // Maintain aspect ratio but fit within container
        const ratio = containerWidth / fabricCanvas.getWidth();
        const newHeight = fabricCanvas.getHeight() * ratio;
        
        fabricCanvas.setDimensions({
          width: containerWidth,
          height: newHeight
        }, { cssOnly: true });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [fabricCanvas]);

  // Update background color
  useEffect(() => {
    if (fabricCanvas) {
      if (bgColor === 'transparent') {
        fabricCanvas.backgroundColor = undefined;
        fabricCanvas.setBackgroundColor(undefined, () => {
          fabricCanvas.renderAll();
        });
      } else {
        fabricCanvas.backgroundColor = bgColor;
        fabricCanvas.renderAll();
      }
    }
  }, [bgColor, fabricCanvas]);

  // Update die-cut outline when bleed changes
  useEffect(() => {
    if (fabricCanvas && imageObject) {
      updateDieCutOutline();
    }
  }, [bleed, imageObject]);

  const handleImageSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Load the image
      const img = await loadImage(file);
      
      // Clear current canvas
      if (fabricCanvas) {
        fabricCanvas.clear();
        setImageObject(null);
        setDieCutObject(null);
      }

      toast.info("Removing background...", { duration: 5000 });
      
      // Process image to remove background
      const processedImageBlob = await removeBackground(img);
      const processedImageUrl = URL.createObjectURL(processedImageBlob);
      
      fabric.Image.fromURL(processedImageUrl, (img) => {
        if (!fabricCanvas) return;
        
        // Center and scale image
        const canvasWidth = fabricCanvas.getWidth();
        const canvasHeight = fabricCanvas.getHeight();
        
        img.scaleToWidth(canvasWidth * 0.8);
        
        if (img.getScaledHeight() > canvasHeight * 0.8) {
          img.scaleToHeight(canvasHeight * 0.8);
        }
        
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center'
        });
        
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        setImageObject(img);
        
        // Generate die-cut outline
        updateDieCutOutline(img);
        
        fabricCanvas.renderAll();
        setIsProcessing(false);
        toast.success("Background removed successfully!");
      });
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessing(false);
      toast.error("Error processing image. Please try again with a different image.");
    }
  };

  const updateDieCutOutline = (img?: fabric.Image) => {
    if (!fabricCanvas) return;
    
    // Remove existing die-cut object if it exists
    if (dieCutObject) {
      fabricCanvas.remove(dieCutObject);
    }
    
    const imgObj = img || imageObject;
    if (!imgObj) return;
    
    // Generate new die-cut outline
    const outline = generateDieCutOutline(fabricCanvas, imgObj, bleed);
    
    if (outline) {
      fabricCanvas.add(outline);
      fabricCanvas.sendToBack(outline);
      setDieCutObject(outline);
    }
  };

  const downloadImage = () => {
    if (!fabricCanvas || !imageObject) {
      toast.error("No image to download");
      return;
    }
    
    // Create a temporary canvas for download
    const downloadCanvas = document.createElement('canvas');
    const ctx = downloadCanvas.getContext('2d');
    if (!ctx) return;
    
    // Set the download canvas dimensions to match the original canvas
    downloadCanvas.width = fabricCanvas.getWidth();
    downloadCanvas.height = fabricCanvas.getHeight();
    
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    }
    
    // Export the canvas as a dataURL
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    // Create a temporary link for download
    const link = document.createElement('a');
    link.download = 'die-cut-image.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded successfully!");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-center">Die-Cut Image Editor</h1>
        <p className="text-muted-foreground text-center">
          Upload an image, remove the background, and generate a die-cut outline
        </p>
      </div>
      
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="mt-4">
          <div className="flex flex-col gap-6">
            <div 
              ref={canvasContainerRef} 
              className={`relative border rounded-lg overflow-hidden ${bgColor === 'transparent' ? 'checkerboard' : ''}`}
            >
              <canvas ref={canvasRef} />
              {!imageObject && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-medium mb-2">No Image Selected</p>
                  <p className="text-sm text-muted-foreground">
                    Upload an image to begin editing
                  </p>
                  <Button 
                    onClick={() => document.querySelector('[data-value="upload"]')?.dispatchEvent(new Event('click'))}
                    className="mt-4"
                    variant="default"
                  >
                    Upload Image <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {imageObject && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-4 col-span-2">
                  <div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="bleed">Die-Cut Bleed ({bleed}px)</Label>
                      <Square className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Slider 
                      id="bleed"
                      min={5} 
                      max={30} 
                      step={1}
                      value={[bleed]} 
                      onValueChange={(value) => setBleed(value[0])}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="background" className="mb-2 block">Background</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {['#ffffff', '#000000', '#f2f2f2', '#cccccc', 'transparent'].map((color) => (
                        <button
                          key={color}
                          className={`w-full aspect-square rounded-md border-2 ${
                            bgColor === color ? 'border-primary' : 'border-border'
                          } ${color === 'transparent' ? 'checkerboard' : ''}`}
                          style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
                          onClick={() => setBgColor(color)}
                          aria-label={`Set background to ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Button 
                    onClick={downloadImage} 
                    className="w-full"
                    disabled={!imageObject || isProcessing}
                  >
                    Download Image
                  </Button>
                  <Button 
                    onClick={() => document.querySelector('[data-value="upload"]')?.dispatchEvent(new Event('click'))}
                    variant="outline" 
                    className="w-full"
                    disabled={isProcessing}
                  >
                    Upload New Image
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="mt-4">
          <div className="flex flex-col gap-6 items-center">
            <div className="max-w-md w-full">
              <ImageUploader onImageSelected={handleImageSelected} isProcessing={isProcessing} />
            </div>
            
            <div className="w-full max-w-md">
              <Separator className="my-4" />
              <h3 className="text-lg font-medium mb-2">How it works</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
                <li>Upload your image using drag-and-drop or file picker</li>
                <li>The background will be automatically removed</li>
                <li>A die-cut outline will be generated around your image</li>
                <li>Adjust the bleed amount to change the outline spacing</li>
                <li>Download the finished image with the die-cut path</li>
              </ol>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DieCutEditor;
