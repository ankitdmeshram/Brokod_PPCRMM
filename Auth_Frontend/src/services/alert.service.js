import Swal from "sweetalert2";


const baseOptions = {
  confirmButtonColor: "var(--color-primary)",
  customClass: { popup: "swal-popup" },
};

export function showSuccessAlert(title, text) {
  return Swal.fire({ ...baseOptions, icon: "success", title, text });
}

export function showErrorAlert(title, text) {
  return Swal.fire({ ...baseOptions, icon: "error", title, text });
}

export function showInfoAlert(title, text) {
  return Swal.fire({ ...baseOptions, icon: "info", title, text });
}
