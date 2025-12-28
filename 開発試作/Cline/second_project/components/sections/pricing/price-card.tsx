"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PriceCardProps {
  title: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isLoading?: boolean;
  onSubscribe: () => void;
}

export function PriceCard({ title, price, description, features, isPopular, isLoading, onSubscribe }: PriceCardProps) {
  return (
    <Card className={`p-6 relative ${isPopular ? 'border-pink-500 border-2' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-4 py-1 rounded-full text-sm">
          人気プラン
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="text-4xl font-bold mb-2">
          ¥{price.toLocaleString()}<span className="text-base font-normal text-gray-600">/月</span>
        </div>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button 
        className={`w-full ${isPopular ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : ''}`}
        variant={isPopular ? "default" : "outline"}
        size="lg"
        onClick={onSubscribe}
        disabled={isLoading}
      >
        {isLoading ? "処理中..." : "申し込む"}
      </Button>
    </Card>
  );
}