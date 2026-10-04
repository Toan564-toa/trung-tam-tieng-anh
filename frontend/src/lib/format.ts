const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })

export const formatVnd = (value: number) => vnd.format(value)
