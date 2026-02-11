import React from 'react';
import { Clock, Users, BookOpen } from 'lucide-react';
import type { Course } from '../../types';
import Image from 'next/image';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {course.thumbnail && (
        <div className="relative w-full h-48">
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#3498db]">{course.category}</span>
          <span className={`
            px-2 py-1 text-xs rounded-full
            ${course.level === '初級' ? 'bg-green-100 text-green-800' :
              course.level === '中級' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'}
          `}>
            {course.level}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-[#2c3e50] mb-2">{course.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{course.description}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-2" />
            <span>{course.enrolledCount}人が受講中</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <BookOpen className="h-4 w-4 mr-2" />
            <span>{course.lessonCount}レッスン</span>
          </div>
        </div>
        <button className="w-full bg-[#3498db] text-white py-2 px-4 rounded-md hover:bg-[#2980b9] transition-colors">
          コースを開始
        </button>
      </div>
    </div>
  );
}