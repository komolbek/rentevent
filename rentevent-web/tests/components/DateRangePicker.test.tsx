import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker } from '@/components/ui/DateRangePicker'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('DateRangePicker', () => {
  it('should render with a label', () => {
    render(
      <DateRangePicker
        value={undefined}
        onChange={() => {}}
        label="Rental Period"
      />
    )

    expect(screen.getByText('Rental Period')).toBeInTheDocument()
  })

  it('should show placeholder text when no dates selected', () => {
    render(
      <DateRangePicker
        value={undefined}
        onChange={() => {}}
      />
    )

    expect(screen.getByText(/Выберите даты/)).toBeInTheDocument()
  })

  it('should display selected date range', () => {
    const value = {
      from: new Date('2025-03-01'),
      to: new Date('2025-03-05'),
    }

    render(
      <DateRangePicker
        value={value}
        onChange={() => {}}
      />
    )

    // Should display formatted dates (in Russian locale)
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('1')
    expect(button.textContent).toContain('5')
  })

  it('should show rental days count when range is selected', () => {
    const value = {
      from: new Date('2025-03-01'),
      to: new Date('2025-03-05'),
    }

    render(
      <DateRangePicker
        value={value}
        onChange={() => {}}
      />
    )

    // 5 days rental (March 1-5)
    expect(screen.getByText(/5 дней/)).toBeInTheDocument()
  })

  it('should show "1 день" for single day', () => {
    const value = {
      from: new Date('2025-03-01'),
      to: new Date('2025-03-01'),
    }

    render(
      <DateRangePicker
        value={value}
        onChange={() => {}}
      />
    )

    expect(screen.getByText(/1 день/)).toBeInTheDocument()
  })

  it('should display error message', () => {
    render(
      <DateRangePicker
        value={undefined}
        onChange={() => {}}
        error="Please select dates"
      />
    )

    expect(screen.getByText('Please select dates')).toBeInTheDocument()
  })

  it('should open calendar on button click', () => {
    render(
      <DateRangePicker
        value={undefined}
        onChange={() => {}}
      />
    )

    const triggerButton = screen.getByText(/Выберите даты/)
    fireEvent.click(triggerButton)

    // Calendar should appear with the header
    expect(screen.getByText(/Выберите период аренды/)).toBeInTheDocument()
  })

  it('should call onChange with undefined when clear is clicked', () => {
    const onChange = vi.fn()
    const value = {
      from: new Date('2025-03-01'),
      to: new Date('2025-03-05'),
    }

    render(
      <DateRangePicker
        value={value}
        onChange={onChange}
      />
    )

    // Open the calendar first
    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    // Click the clear button
    const clearButton = screen.getByText('Очистить')
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <DateRangePicker
        value={undefined}
        onChange={() => {}}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
