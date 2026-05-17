0. Thêm tính năng khoản vay cho người khác vay
    0.1. cần thêm 1 tab "Cho vay" trên UI trong mục Nợ.
    0.2. Khi tạo một khoản cho vay, cần require các thông tin điền trên UI: số tiền cho vay, số tiền trả, ngày cho vay, ngày trả, người cho vay (tên khoản vay), ghi chú.
    0.3. Show thông tin 1 cách thông minh trên Dashboard
    0.4. Không cho phép cho vay với số tiền bằng 0
    0.5. Thêm 1 button "Đã trả" ở mục chi tiết khoản vay cho vay, khi user click vào thì update số tiền trả, ví dụ khoản cho vay là 100tr, chia 5 lần trả, thì sau khi trả lần 1 là 20tr thì show là đã trả 20tr/100tr.
    0.6. Có option trả hết, bấm button "Trả hết" thì update số tiền trả bằng số tiền cho vay và đánh dấu là đã trả.
    0.7. Nếu đã trả hết toàn bộ số tiền cho vay thì không show record này trong các tháng sau nữa.
    0.8. Tới tháng cuối cùng, nếu chưa trả hết thì có tính năng hẹn dời trả, có thể chọn tháng sẽ trả trong tương lai

--------------------------------------------------
ASK CLAUDE CODE TO GENERATE REQUIREMENTS 1
--------------------------------------------------

1. đối với nợ, thêm 1 loại vay cá nhân nhưng không trả theo tháng mà vay 1 khoảng thời gian và trả 1 cục tất cả cho người quen. Ví dụ: mượn người nhà, hay mượn bạn bè. Khi mượn thì không tính vào thu nhập, khi trả thì tính vào chi phí.
    1.1. khi tạo một khoản nợ, cần require các thông tin điền trên UI: số tiền mượn, số tiền trả, ngày mượn, ngày trả, người mượn (tên khoản vay), ghi chú.
    1.2. Trong tab Khoản nợ, chia làm 2 tab: "Khoản nợ cần trả hàng tháng" - như các khoản hiện tại, và "Khoản nợ vay cá nhân (trả theo mốc)" - tính năng mới trong mục 1
    1.3. Không add lạoi này vào chi trả hàng tháng, vì có thể mượn 1 thời gian dài, và khi trả là trả hết (tức là sẽ không add vào Tổng Trả Nợ trong Dashboard và không add vào )
    1.4. Khi tab qua các tháng khác nhau, vẫn show records nếu chưa thanh toán hết, ví dụ khoản vay từ 2026-01-01 tới 2026-12-31 thì khi show các tháng từ 2026-01 tới 2026-12 vẫn show khoản vay này nếu chưa thanh toán
    1.5. ở tab Tổng Quan Tháng, không mặc định add record này vào tab này, sẽ có 1 nút để khi user click vào thì sẽ hiện ra popup tất cả các khoản nợ (chỉ áp dụng loại mới này) có trong tháng đó để cho user chọn, mặc định là không chọn tất cả, user có thể chọn những khoản muốn add, sau khi chọn xong thì click button "Add to mark đã trả trong tháng này", sau khi add xong thì tự mark đã trả luôn.


--------------------------------------------------
ASK CLAUDE CODE TO GENERATE REQUIREMENTS 2
--------------------------------------------------

1. Trong các tab Chi Tiêu, Thu Nhập và Tổng quan tháng, sửa UI, các list đối với dạng "Một lần", show và group các records theo ngày. Ví dụ: có 3 records Chi Tiêu loại Một Lần ngày 2026-05-01, 1 record ngày 2026-05-02, 1 record ngày 2026-05-03. Thì sẽ show group 3 records ngày 2026-05-01; group 1 record ngày 2026-05-02; group 1 record ngày 2026-05-03. Ở các group này sẽ có nút để collapse/expand các records bên trong group. Chỉ sửa UI, không cần sửa Backend


2. Trong các tab Chi Tiêu, Thu Nhập và Tổng quan tháng, thêm 1 button chuyển đổi dạng view sang calendar dạng tháng, show tất cả ngày trong tháng, các ngày nào có chi tiêu/thu nhập thì sẽ show total số tiền, khi hover chuột vào ngày nào thì sẽ show popup list các chi tiêu/thu nhập trong ngày đó (bao gồm các khoản định kỳ và 1 lần), khi hover chuột ra ngoài thì tắt popup đi. Khi click vào ngày nào trong tháng thì show popup, có nút X (close) để tắt popup
Tính năng này tôi nghĩ chỉ cần sửa UX UI trong repo frontend, không cần sửa backend, vì data đã có sẵn trước đó khi gọi các API như hiện tại để show data trên frontend như dạng list hiện tại. Nếu cần thiết phải sửa backend thì cần báo cho tôi biết trước để tôi xem xét.
    - 2.1. Khi show các chi tiêu/thu nhập trong ngày đó thì bao gồm các khoản định kỳ và 1 lần
    - 2.2. ở giao diện calendar mới dạng show full ngày trong tháng, thì chỉ show total số tiền trong ngày hôm đó
    - 2.3. Ở giao diện calendar dạng show full ngày trong tháng, khi user hover vào ngày nào, show popup nhỏ ở dạng overview
    - 2.4. Ở giao diện calendar mới dạng show full ngày trong tháng, khi user click vào ngày nào thì show popup lớn, list các chi tiêu/thu nhập trong ngày đó (bao gồm các khoản định kỳ và 1 lần), khi click outside thì tắt popup đi. Trong popup này vẫn có nút X để tắt popup

