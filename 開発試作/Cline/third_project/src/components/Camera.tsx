import React, { useCallback, useRef, useState } from 'react'
import Webcam from 'react-webcam'

interface CameraProps {
  onCapture: (imageData: string) => void
}

const Camera: React.FC<CameraProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const capture = useCallback(() => {
    if (!webcamRef.current) return

    setIsCapturing(true)
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      onCapture(imageSrc)
    }
    setIsCapturing(false)
  }, [onCapture])

  return (
    <div className="relative w-full max-w-md mx-auto">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="w-full rounded-lg shadow-lg"
      />
      <button
        onClick={capture}
        disabled={isCapturing}
        className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isCapturing ? '撮影中...' : '撮影する'}
      </button>
    </div>
  )
}

export default Camera
