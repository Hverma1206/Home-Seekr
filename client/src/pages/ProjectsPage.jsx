import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import ProjectCard from '../components/ProjectCard'
import { projectService } from '../services/projectService'

const ProjectsPage = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  // A search from the home page arrives with its city/locality
  const city = state?.filters?.city || ''
  const locality = state?.filters?.locality || ''
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    projectService
      .getProjects({ city: city || undefined, locality: locality || undefined, limit: 30 })
      .then((response) => {
        if (!isActive) return
        setProjects(response.projects)
        setError('')
      })
      .catch(() => {
        if (isActive) setError('Unable to load projects.')
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [city, locality])

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-3">
        New projects{city ? ` in ${city}` : ''}
      </h1>
      <p className="text-slate-500 font-medium mb-10">
        Builder projects with configurations, pricing and possession dates.
      </p>

      {loading && <p className="text-slate-400 font-semibold">Loading projects...</p>}
      {error && <p role="alert" className="text-rose-500 font-semibold">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="text-slate-500 font-medium">No projects found{city ? ` in ${city}` : ''} yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => navigate(`/projects/${project.id}`)}
          />
        ))}
      </div>
    </Motion.div>
  )
}

export default ProjectsPage
