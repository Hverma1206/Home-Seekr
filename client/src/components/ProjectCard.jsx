import { motion } from 'framer-motion'
import { MapPin, Calendar, Building2 } from 'lucide-react'
import Badge from './ui/Badge'

const formatCurrency = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 'N/A'
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

const ProjectCard = ({ project, onClick }) => {
  const priceMin = project.priceRange?.min || 0
  const priceMax = project.priceRange?.max || 0
  const priceLabel = priceMin || priceMax
    ? `${formatCurrency(priceMin)} - ${formatCurrency(priceMax)}`
    : 'Price on request'

  const projectTypeLabel = project.projectType?.replace('_', ' ') || 'project'
  const statusLabel = project.status?.replace('_', ' ') || 'ongoing'

  const possessionLabel = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group cursor-pointer bg-white rounded-[2rem] p-3 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 border border-slate-100"
      onClick={() => onClick?.(project)}
    >
      <div className="relative h-56 w-full overflow-hidden rounded-[1.5rem]">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant="dark">{projectTypeLabel}</Badge>
          <Badge variant="light">{statusLabel}</Badge>
        </div>
        <div className="absolute bottom-4 left-4">
          <p className="text-xl font-bold text-white">{priceLabel}</p>
        </div>
      </div>

      <div className="px-3 pb-2 pt-4">
        <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight line-clamp-1 group-hover:text-emerald-600 transition-colors">
          {project.name}
        </h3>
        <p className="text-slate-500 text-sm flex items-center gap-2 mb-3 font-medium">
          <MapPin className="w-4 h-4 text-emerald-500" />
          {project.locality}{project.city ? `, ${project.city}` : ''}
        </p>
        <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            {project.builder?.name || 'Builder'}
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            {possessionLabel}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default ProjectCard
