import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Music, FileText, Edit, Trash2, Play, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Project, InsertProject } from "@shared/schema";

export default function ProjectManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<InsertProject>({
    name: "",
    clientName: "",
    languagePair: "",
    videoFile: undefined
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  const createProjectMutation = useMutation({
    mutationFn: async (project: InsertProject) => {
      return apiRequest('/api/projects', {
        method: 'POST',
        body: project
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateDialogOpen(false);
      setNewProject({ name: "", clientName: "", languagePair: "", videoFile: undefined });
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully."
      });
    }
  });

  const handleCreateProject = () => {
    if (!newProject.name || !newProject.clientName || !newProject.languagePair) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    createProjectMutation.mutate(newProject);
  };

  const handleVideoUpload = async (file: File, projectId: number) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Upload file using apiRequest with FormData support
      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      // Update project with video file
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: { videoFile: response.filename }
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Video Uploaded",
        description: "Video file has been uploaded successfully."
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video file.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                STS Project Manager
              </h1>
              <p className="text-gray-400 mt-1">Manage your speech-to-speech dubbing projects</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Set up a new STS dubbing project with your client details and language pair.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="projectName" className="text-sm font-medium text-gray-300">
                      Project Name *
                    </Label>
                    <Input
                      id="projectName"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Enter project name"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientName" className="text-sm font-medium text-gray-300">
                      Client Name *
                    </Label>
                    <Input
                      id="clientName"
                      value={newProject.clientName}
                      onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                      placeholder="Enter client name"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="languagePair" className="text-sm font-medium text-gray-300">
                      Language Pair *
                    </Label>
                    <Input
                      id="languagePair"
                      value={newProject.languagePair}
                      onChange={(e) => setNewProject({ ...newProject, languagePair: e.target.value })}
                      placeholder="e.g., English → Spanish"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Projects Yet</h3>
            <p className="text-gray-500 mb-6">Create your first STS project to get started</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1">
                        {project.clientName}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => deleteProjectMutation.mutate(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="border-blue-500 text-blue-400">
                      {project.languagePair}
                    </Badge>
                    {project.videoFile && (
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  
                  {/* Video Upload Section */}
                  {!project.videoFile ? (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                      <Video className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400 mb-2">Upload reference video</p>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file, project.id);
                        }}
                        className="hidden"
                        id={`video-upload-${project.id}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`video-upload-${project.id}`)?.click()}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Choose File
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Video className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">Video uploaded</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Link href={`/sts-editor/${project.id}`}>
                      <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                        <Play className="w-4 h-4 mr-2" />
                        Open Editor
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}