import { useEffect, useState, type FormEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import type {
  InstallerOption,
  ProjectInsert,
  ProjectStatus,
} from '@/types/database.types'

export type ProjectFormValues = {
  title: string
  client_name: string
  address: string
  status: ProjectStatus
  assigned_installer_id: string
}

export type ProjectFormErrors = Partial<Record<keyof ProjectFormValues, string>>

export function validateProjectForm(values: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {}

  if (!values.title.trim()) errors.title = 'El título es obligatorio'
  if (!values.client_name.trim()) errors.client_name = 'El cliente es obligatorio'
  if (!values.address.trim()) errors.address = 'La dirección es obligatoria'

  return errors
}

type ProjectFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: ProjectInsert) => Promise<unknown> | unknown
  installers: InstallerOption[]
  submitting?: boolean
  submitError?: string | null
}

const EMPTY: ProjectFormValues = {
  title: '',
  client_name: '',
  address: '',
  status: 'Pendiente',
  assigned_installer_id: '',
}

export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  installers,
  submitting = false,
  submitError = null,
}: ProjectFormModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(EMPTY)
  const [errors, setErrors] = useState<ProjectFormErrors>({})

  useEffect(() => {
    if (!open) {
      setValues(EMPTY)
      setErrors({})
    }
  }, [open])

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateProjectForm(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload: ProjectInsert = {
      title: values.title.trim(),
      client_name: values.client_name.trim(),
      address: values.address.trim(),
      status: values.status,
      assigned_installer_id: values.assigned_installer_id || null,
    }

    await onSubmit(payload)
  }

  function handleClose() {
    setValues(EMPTY)
    setErrors({})
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nuevo proyecto"
      description="Complete los datos de la instalación solar."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <Input
          name="title"
          label="Título"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
        />
        <Input
          name="client_name"
          label="Cliente"
          value={values.client_name}
          onChange={(e) => update('client_name', e.target.value)}
          error={errors.client_name}
        />
        <Input
          name="address"
          label="Dirección"
          value={values.address}
          onChange={(e) => update('address', e.target.value)}
          error={errors.address}
        />
        <Select
          name="status"
          label="Estado"
          value={values.status}
          onChange={(e) => update('status', e.target.value as ProjectStatus)}
        >
          <option value="Pendiente">Pendiente</option>
          <option value="En Progreso">En Progreso</option>
          <option value="Completado">Completado</option>
        </Select>
        <Select
          name="assigned_installer_id"
          label="Instalador asignado"
          value={values.assigned_installer_id}
          onChange={(e) => update('assigned_installer_id', e.target.value)}
        >
          <option value="">Sin asignar</option>
          {installers.map((installer) => (
            <option key={installer.id} value={installer.id}>
              {installer.full_name}
              {installer.specialty ? ` · ${installer.specialty}` : ''}
            </option>
          ))}
        </Select>

        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Crear proyecto
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
