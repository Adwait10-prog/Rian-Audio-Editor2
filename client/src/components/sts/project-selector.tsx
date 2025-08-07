import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { ChevronDown, FolderOpen, Plus, Video } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: number;
  name: string;
  clientName: string;
  languagePair: string;
  videoFile: string | null;
  sourceAudioFile: string | null;
  videoDuration: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  currentProjectId: number;
  onProjectChange: (project: Project) => void;
}

export default function ProjectSelector({ currentProjectId, onProjectChange }: ProjectSelectorProps) {
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState("English to English");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("/api/projects")
  });

  const currentProject = projects.find(p => p.id === currentProjectId);

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; clientName: string; languagePair: string }) => {
      return apiRequest("/api/projects", {
        method: 'POST',
        body: projectData
      });
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onProjectChange(newProject);
      setShowNewProjectDialog(false);
      setNewProjectName("");
      setNewProjectClient("");
      setNewProjectLanguage("English to English");
      toast({
        title: "Project Created",
        description: `Project "${newProject.name}" has been created successfully.`
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create new project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !newProjectClient.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both project name and client name.",
        variant: "destructive"
      });
      return;
    }

    createProjectMutation.mutate({
      name: newProjectName.trim(),
      clientName: newProjectClient.trim(),
      languagePair: newProjectLanguage
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-3 py-1 rounded hover:rian-elevated max-w-xs">
            <FolderOpen className="w-4 h-4 mr-2" />
            <span className="truncate">{currentProject?.name || "Select Project"}</span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="rian-surface rian-border min-w-64">
          <div className="px-3 py-2 text-xs text-gray-400 font-medium">PROJECTS</div>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              className={`hover:rian-elevated cursor-pointer ${
                project.id === currentProjectId ? 'bg-[var(--rian-accent)] bg-opacity-20' : ''
              }`}
              onClick={() => onProjectChange(project)}
            >
              <div className="flex items-center w-full">
                {project.videoFile ? (
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                ) : (
                  <FolderOpen className="w-4 h-4 mr-2" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {project.clientName} • {project.languagePair}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="rian-border" />
          <DropdownMenuItem 
            className="hover:rian-elevated cursor-pointer"
            onClick={() => setShowNewProjectDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="rian-surface rian-border">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Client Name
              </label>
              <input
                type="text"
                value={newProjectClient}
                onChange={(e) => setNewProjectClient(e.target.value)}
                placeholder="Enter client name"
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Language Pair
              </label>
              <select
                value={newProjectLanguage}
                onChange={(e) => setNewProjectLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="English to English">English to English</option>
                <option value="English to Spanish">English to Spanish</option>
                <option value="English to French">English to French</option>
                <option value="Spanish to English">Spanish to English</option>
                <option value="French to English">French to English</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowNewProjectDialog(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}