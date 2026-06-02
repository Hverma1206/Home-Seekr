import apiClient from './authService'

const normalizeProject = (project) => {
  const priceRange = project.priceRange || {}
  const pricePerSqft = project.pricePerSqft || {}
  const builder = project.builder || {}

  return {
    id: project._id || project.id,
    name: project.name || 'Project',
    city: project.city || '',
    state: project.state || '',
    locality: project.locality || '',
    status: project.status || 'ongoing',
    projectType: project.projectType || 'residential',
    propertyTypes: project.propertyType || [],
    priceRange: {
      min: priceRange.min || 0,
      max: priceRange.max || 0,
    },
    pricePerSqft: {
      min: pricePerSqft.min || 0,
      max: pricePerSqft.max || 0,
    },
    avgPrice: project.avgPrice || 0,
    configurations: project.configurations || [],
    amenities: project.amenities || [],
    highlights: project.highlights || [],
    possessionDate: project.possessionDate || null,
    images: project.images || [],
    thumbnail: project.thumbnail || (project.images && project.images[0]) || '',
    builder: {
      name: project.developerName || builder.companyName || builder.firstName || 'Builder',
      logo: project.developerLogo || builder.profileImage || '',
    },
    raw: project,
  }
}

export const projectService = {
  async getProjects(params = {}) {
    const response = await apiClient.get('/projects', { params })
    const data = response.data || {}
    const projects = Array.isArray(data.projects)
      ? data.projects.map(normalizeProject)
      : []

    return {
      projects,
      total: data.meta?.total || projects.length,
      meta: data.meta || {},
    }
  },

  async getProjectDetails(projectId) {
    const response = await apiClient.get(`/projects/${projectId}`)
    const data = response.data || {}

    return {
      project: data.project ? normalizeProject(data.project) : null,
      similarProjects: Array.isArray(data.similarProjects)
        ? data.similarProjects.map(normalizeProject)
        : [],
    }
  },

  async createProject(payload) {
    const response = await apiClient.post('/projects', payload)
    return response.data
  },
}
