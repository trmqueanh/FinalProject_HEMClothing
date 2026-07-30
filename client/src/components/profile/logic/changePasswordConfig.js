// Cấu hình và state mặc định của form đổi mật khẩu.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,25}$/;
export const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'];

export const createDefaultPasswordForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});
