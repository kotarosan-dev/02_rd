"use client";

import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface TransformationCardProps {
  beforeImage: string;
  afterImage: string;
  title: string;
  description: string;
  duration: string;
}

export function TransformationCard({
  beforeImage,
  afterImage,
  title,
  description,
  duration
}: TransformationCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-1/2 h-48 md:h-64">
          <Image
            src={beforeImage}
            alt="Before"
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-sm rounded">
            Before
          </div>
        </div>
        <div className="relative w-full md:w-1/2 h-48 md:h-64">
          <Image
            src={afterImage}
            alt="After"
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-2 py-1 text-sm rounded">
            After
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-2">{description}</p>
        <p className="text-sm text-gray-500">施術期間: {duration}</p>
      </div>
    </Card>
  );
}