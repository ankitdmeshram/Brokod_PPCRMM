import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#3155ff",
  customClass: {
    popup: "swal-popup",
  },
};

export function showSuccessAlert(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "success",
    title,
    text,
  });
}

export function showErrorAlert(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "error",
    title,
    text,
  });
}

export function showInfoAlert(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "info",
    title,
    text,
  });
}
