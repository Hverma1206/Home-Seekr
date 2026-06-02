import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Calendar, MapPin, Star } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProjectCard from '../components/ProjectCard'
import { projectService } from '../services/projectService'

const formatCurrency = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 'N/A'
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

const ProjectDetailsPage = () => {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [similarProjects, setSimilarProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchProject = async () => {
      if (!projectId) return

      setLoading(true)
      setError('')

      try {
        const response = await projectService.getProjectDetails(projectId)
        if (!isActive) return
        setProject(response.project)
        setSimilarProjects(response.similarProjects || [])
      } catch (err) {
        if (!isActive) return
        setError('Unable to load project details.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchProject()

    return () => {
      isActive = false
    }
  }, [projectId])

  const priceLabel = useMemo(() => {
    if (!project) return ''
    const min = project.priceRange?.min || 0
    const max = project.priceRange?.max || 0
    if (!min && !max) return 'Price on request'
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }, [project])

  if (loading) {
    return (
      <div className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-slate-400 font-semibold">Loading project details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-rose-500 font-semibold">{error}</p>
      </div>
    )
  }

  if (!project) return null

  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  const configurations = project.configurations || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
    >
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-8 hover:text-slate-900 uppercase tracking-wider transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12">
        <div>
          <div className="relative rounded-[2.5rem] overflow-hidden h-[360px] mb-8">
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <Badge variant="dark">{project.projectType}</Badge>
              <h1 className="text-4xl font-black text-white mt-3">{project.name}</h1>
              <p className="text-white/80 font-medium mt-2">
                {project.locality}{project.city ? `, ${project.city}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Price Range</p>
              <p className="text-xl font-black text-slate-900 mt-2">{priceLabel}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Possession</p>
              <p className="text-xl font-black text-slate-900 mt-2">{possession}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Status</p>
              <p className="text-xl font-black text-slate-900 mt-2">{project.status.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Project Overview</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              {project.raw?.description ||
                `Discover ${project.name}, a premier ${project.projectType} community in ${project.locality}.`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="rounded-[1.5rem] border border-slate-100 p-6">
              <h3 className="text-lg font-black text-slate-900 mb-4">Key Highlights</h3>
              <div className="flex flex-wrap gap-2">
                {(project.highlights || []).map((item) => (
                  <Badge key={item} variant="light">{item}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 p-6">
              <h3 className="text-lg font-black text-slate-900 mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {(project.amenities || []).map((item) => (
                  <Badge key={item} variant="light">{item}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 p-6 mb-10">
            <h3 className="text-lg font-black text-slate-900 mb-4">Configurations</h3>
            {configurations.length ? (
              <div className="space-y-4">
                {configurations.map((config) => (
                  <div key={config.type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{config.type}</p>
                      <p className="text-xs text-slate-500">{config.minArea} - {config.maxArea} sq.ft.</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(config.priceMin)} - {formatCurrency(config.priceMax)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Configuration details coming soon.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-slate-900 text-white p-6">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Builder</p>
            <h3 className="text-2xl font-black mt-2">{project.builder?.name || 'Builder'}</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-300" />
                {project.projectType.replace('_', ' ')} focus
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-300" />
                {project.city}, {project.state}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-300" />
                Possession {possession}
              </div>
            </div>
            <Button variant="accent" className="w-full mt-6">
              Get Brochure
            </Button>
          </div>

          <div className="rounded-[2rem] border border-slate-100 p-6">
            <h3 className="text-lg font-black text-slate-900 mb-3">Property Types</h3>
            <div className="flex flex-wrap gap-2">
              {project.propertyTypes.map((type) => (
                <Badge key={type} variant="light">{type.replace('_', ' ')}</Badge>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 p-6">
            <h3 className="text-lg font-black text-slate-900 mb-3">Sales Snapshot</h3>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
              <span>Avg Price</span>
              <span>{formatCurrency(project.avgPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600 mt-3">
              <span>Price / Sq Ft</span>
              <span>
                {formatCurrency(project.pricePerSqft?.min)} - {formatCurrency(project.pricePerSqft?.max)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600 mt-3">
              <span>Ratings</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <Star className="w-4 h-4" fill="currentColor" /> 4.6
              </span>
            </div>
          </div>
        </div>
      </div>

      {similarProjects.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Similar Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {similarProjects.map((item) => (
              <ProjectCard key={item.id} project={item} onClick={() => navigate(`/projects/${item.id}`)} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default ProjectDetailsPage
