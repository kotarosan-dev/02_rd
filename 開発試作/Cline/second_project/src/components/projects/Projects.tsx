import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';

export function Projects() {
  const { projects } = useProjects();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#2c3e50]">プロジェクト</h2>
        <button className="flex items-center px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9] transition-colors">
          <Plus className="h-5 w-5 mr-2" />
          新規プロジェクト
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="プロジェクトを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          <Filter className="h-5 w-5 mr-2" />
          フィルター
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}