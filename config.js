// Cấu hình đồng bộ. Hai giá trị này được thiết kế để công khai (được bảo vệ bằng quy tắc
// "mỗi người chỉ đọc dữ liệu của mình" trên máy chủ). KHÔNG đặt khóa service_role / secret ở đây.
window.NKTG_CONFIG = window.NKTG_CONFIG || {
  supabaseUrl: '',
  supabaseKey: '',
};
