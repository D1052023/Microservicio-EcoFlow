import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectFormModal } from '../ProjectFormModal'
import type { InstallerOption, ProjectInsert } from '@/types/database.types'

const installers: InstallerOption[] = [
  { id: 'inst-1', full_name: 'Ana Solar', specialty: 'Tejado' },
]

describe('ProjectFormModal', () => {
  it('no permite el envío si title, client_name y address están vacíos', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(payload: ProjectInsert) => Promise<void>>()

    render(
      <ProjectFormModal
        open
        onClose={() => undefined}
        onSubmit={onSubmit}
        installers={installers}
      />,
    )

    await user.click(screen.getByRole('button', { name: /crear proyecto/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El cliente es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La dirección es obligatoria')).toBeInTheDocument()
  })

  it('invoca la inserción con los parámetros esperados cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(payload: ProjectInsert) => Promise<void>>().mockResolvedValue()

    render(
      <ProjectFormModal
        open
        onClose={() => undefined}
        onSubmit={onSubmit}
        installers={installers}
      />,
    )

    await user.type(screen.getByLabelText('Título'), '  Casa El Poblado  ')
    await user.type(screen.getByLabelText('Cliente'), 'Familia Gómez')
    await user.type(screen.getByLabelText('Dirección'), 'Cra 43A #1')
    await user.selectOptions(screen.getByLabelText('Estado'), 'En Progreso')
    await user.selectOptions(screen.getByLabelText('Instalador asignado'), 'inst-1')
    await user.click(screen.getByRole('button', { name: /crear proyecto/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Casa El Poblado',
      client_name: 'Familia Gómez',
      address: 'Cra 43A #1',
      status: 'En Progreso',
      assigned_installer_id: 'inst-1',
    })
  })
})
