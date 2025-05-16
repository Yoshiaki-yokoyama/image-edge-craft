
import { fabric } from 'fabric';

export const generateDieCutOutline = (canvas: fabric.Canvas, imageObject: fabric.Image, padding = 10) => {
  if (!canvas || !imageObject || !imageObject.getElement()) return null;

  const img = imageObject.getElement() as HTMLImageElement;
  
  // Create a temporary canvas to analyze the alpha channel
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Set dimensions to match the image
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  
  // Draw the image to analyze its alpha channel
  ctx.drawImage(img, 0, 0);
  
  // Get the image data to analyze pixels
  const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // Find the edge points where alpha transitions from transparent to opaque
  const points: { x: number, y: number }[] = [];
  const alphaThreshold = 128; // Threshold for considering a pixel opaque
  const step = 5; // Sample every 5 pixels for performance
  
  // Sample the perimeter of the image to find edge points
  // This is a simplified approach - a more sophisticated edge detection would use
  // algorithms like marching squares or contour tracing
  for (let x = 0; x < tempCanvas.width; x += step) {
    for (let y = 0; y < tempCanvas.height; y += step) {
      const index = (y * tempCanvas.width + x) * 4;
      const alpha = data[index + 3];
      
      // Check if this pixel is opaque and has at least one transparent neighbor
      if (alpha > alphaThreshold) {
        const hasTransparentNeighbor = 
          (x > 0 && data[index - 4 + 3] < alphaThreshold) || // left
          (x < tempCanvas.width - 1 && data[index + 4 + 3] < alphaThreshold) || // right
          (y > 0 && data[index - tempCanvas.width * 4 + 3] < alphaThreshold) || // top
          (y < tempCanvas.height - 1 && data[index + tempCanvas.width * 4 + 3] < alphaThreshold); // bottom
        
        if (hasTransparentNeighbor) {
          points.push({ x, y });
        }
      }
    }
  }
  
  if (points.length < 4) {
    // Not enough points for a valid outline
    return null;
  }
  
  // Convert the edge points to fabric coordinates
  const fabricPoints = points.map(p => {
    // Convert from image coordinates to canvas coordinates
    const canvasPoint = {
      x: (p.x / img.naturalWidth) * imageObject.getScaledWidth() + imageObject.left! - imageObject.getScaledWidth() / 2,
      y: (p.y / img.naturalHeight) * imageObject.getScaledHeight() + imageObject.top! - imageObject.getScaledHeight() / 2
    };
    
    return canvasPoint;
  });
  
  // Simplify the points to reduce the number of vertices
  const simplifiedPoints = simplifyPoints(fabricPoints, 5);
  
  // Create a polygon from the points
  const polygon = new fabric.Polygon(simplifiedPoints, {
    fill: 'transparent',
    stroke: 'white',
    strokeWidth: 2,
    objectCaching: false,
    selectable: false,
    evented: false,
    strokeDashArray: [5, 5],
    shadow: new fabric.Shadow({
      color: 'rgba(0,0,0,0.3)',
      offsetX: 2,
      offsetY: 2,
      blur: 4
    })
  });
  
  // Expand the polygon outward slightly for padding
  expandPolygon(polygon, padding);
  
  return polygon;
};

// Function to simplify a set of points by removing points that are too close together
function simplifyPoints(points: { x: number, y: number }[], tolerance: number): { x: number, y: number }[] {
  if (points.length <= 2) return points;
  
  const result: { x: number, y: number }[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = result[result.length - 1];
    const currentPoint = points[i];
    
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - prevPoint.x, 2) + 
      Math.pow(currentPoint.y - prevPoint.y, 2)
    );
    
    if (distance > tolerance) {
      result.push(currentPoint);
    }
  }
  
  return result;
}

// Expand polygon by moving each point outward from center
function expandPolygon(polygon: fabric.Polygon, amount: number) {
  if (!polygon.points) return;

  // Find the center of the polygon
  const center = polygon.getCenterPoint();
  
  // Move each point outward from center
  polygon.points.forEach(point => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const scale = (distance + amount) / distance;
      point.x = center.x + dx * scale;
      point.y = center.y + dy * scale;
    }
  });
  
  polygon.setCoords();
}
