export interface KnowledgeChunk {
  source: string;
  content: string;
}

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    source: 'Hệ thống VNFlood',
    content: 'VNFlood là hệ thống dự báo rủi ro lũ lụt cho Việt Nam sử dụng học máy và dữ liệu mưa vệ tinh CHIRPS. Hệ thống theo dõi 501 lưu vực sông trên toàn quốc, cập nhật dự báo hàng ngày dựa trên lượng mưa tích lũy 45 ngày. Mô hình LightGBM phân tích lượng mưa, đặc điểm địa hình và dữ liệu bão để tính xác suất lũ lụt cho từng lưu vực.',
  },
  {
    source: 'Mức độ rủi ro lũ lụt',
    content: 'Hệ thống VNFlood phân loại rủi ro thành 4 mức: Thấp (xác suất < 25%) — điều kiện bình thường; Trung bình (25–50%) — có khả năng ngập cục bộ, cần theo dõi; Cao (50–75%) — nguy cơ lũ đáng kể, chuẩn bị di tản; Nguy hiểm (> 75%) — rủi ro nghiêm trọng, cần di tản ngay lập tức.',
  },
  {
    source: 'Ứng phó mức rủi ro thấp',
    content: 'Khi rủi ro ở mức THẤP: Tiếp tục hoạt động bình thường. Theo dõi dự báo thời tiết địa phương. Kiểm tra hệ thống thoát nước quanh nhà. Đảm bảo hộp đồ khẩn cấp luôn sẵn sàng với nước uống, thực phẩm khô và đèn pin.',
  },
  {
    source: 'Ứng phó mức rủi ro trung bình',
    content: 'Khi rủi ro ở mức TRUNG BÌNH: Theo dõi thường xuyên cảnh báo từ cơ quan khí tượng thủy văn. Chuẩn bị túi khẩn cấp gồm giấy tờ, thuốc, nước và thực phẩm đủ 3 ngày. Xác định tuyến đường di tản và điểm trú ẩn gần nhất. Di chuyển đồ vật quan trọng lên cao. Sạc điện thoại và pin dự phòng đầy đủ.',
  },
  {
    source: 'Ứng phó mức rủi ro cao',
    content: 'Khi rủi ro ở mức CAO: Sẵn sàng di tản bất cứ lúc nào. Ngắt điện và ga nếu có nguy cơ ngập nhà. Không đi qua đường ngập — chỉ 15cm nước chảy siết có thể làm ngã người. Liên hệ với người thân về kế hoạch di tản. Chuẩn bị áo phao. Theo dõi ứng dụng VNFlood và đài phát thanh liên tục.',
  },
  {
    source: 'Ứng phó mức rủi ro nguy hiểm',
    content: 'Khi rủi ro ở mức NGUY HIỂM: DI TẢN NGAY khi có lệnh chính quyền. Không chờ đợi — lũ có thể dâng nhanh trong vài phút. Tuyệt đối không lái xe qua đường ngập — 60cm nước cuốn trôi được ô tô. Nếu bị mắc kẹt trong nhà, lên tầng cao nhất, mái nhà và phát tín hiệu cứu hộ. Gọi 113 (Cảnh sát) hoặc 1800 1560 (Đường dây nóng thiên tai, miễn phí 24/7).',
  },
  {
    source: 'Chuẩn bị trước mùa lũ',
    content: 'Chuẩn bị trước mùa lũ: Lập kế hoạch di tản gia đình và xác định điểm tập kết an toàn. Dự trữ nước sạch tối thiểu 3 lít/người/ngày cho 3 ngày. Chuẩn bị túi khẩn cấp gồm giấy tờ tùy thân, thuốc thường dùng, quần áo, đèn pin, radio chạy pin và tiền mặt. Biết vị trí cầu dao điện chính và van khóa ga. Gia cố nhà cửa, kiểm tra mái nhà và cống thoát nước trước mùa mưa.',
  },
  {
    source: 'An toàn trong khi lũ',
    content: 'Trong khi lũ xảy ra: Nghe và tuân thủ hướng dẫn của chính quyền địa phương. KHÔNG đi vào vùng ngập nước dù bằng xe máy hay ô tô. KHÔNG tiếp xúc nước lũ vì có thể chứa chất thải và mầm bệnh. Tránh xa cây cối, cột điện và dây điện. Tắt điện tại cầu dao chính nếu còn trong nhà. Dùng điện thoại chỉ cho trường hợp khẩn cấp.',
  },
  {
    source: 'Sau khi lũ rút',
    content: 'Sau khi lũ rút: Chờ thông báo an toàn của chính quyền trước khi trở về. Kiểm tra rò rỉ ga trước khi bật điện. Vệ sinh và khử trùng đồ vật đã tiếp xúc nước lũ. Dùng nước đóng chai hoặc đun sôi — nước máy có thể ô nhiễm. Chụp ảnh thiệt hại để khai báo bảo hiểm. Theo dõi sức khỏe — nước lũ có thể gây tiêu chảy và leptospirosis.',
  },
  {
    source: 'Hướng dẫn di tản',
    content: 'Di tản an toàn: Mang theo túi khẩn cấp đã chuẩn bị. Đi theo tuyến đường di tản được chỉ định — tránh đường ngắn qua vùng ngập. Hỗ trợ người già, trẻ em và người khuyết tật. Không quay lại lấy đồ khi đã di tản. Đến nhà thi đấu, trường học hoặc điểm trú ẩn được chỉ định. Đăng ký với lực lượng cứu hộ và liên lạc ngay với người thân.',
  },
  {
    source: 'Lũ lụt miền Trung Việt Nam',
    content: 'Miền Trung Việt Nam (Thanh Hóa đến Bình Thuận) chịu lũ nặng nề nhất cả nước. Địa hình hẹp ngang với núi cao sát biển, sông ngắn dốc, mưa tập trung tháng 10–12. Tỉnh nguy cơ cao: Quảng Bình, Quảng Trị, Thừa Thiên Huế, Quảng Nam, Quảng Ngãi, Hà Tĩnh. Lũ miền Trung thường dâng nhanh, rút chậm và xảy ra nhiều đợt liên tiếp trong mùa mưa.',
  },
  {
    source: 'Lũ đồng bằng sông Cửu Long',
    content: 'Đồng bằng sông Cửu Long chịu lũ theo chu kỳ hàng năm từ tháng 7–11, đỉnh lũ vào tháng 9–10. Lũ đến từ thượng nguồn sông Mê Kông (Lào, Campuchia), dâng chậm và có thể dự báo trước 1–2 tuần. An Giang, Đồng Tháp, Long An là vùng ngập sâu nhất. Lũ đồng bằng kéo dài 2–3 tháng nhưng ít nguy hiểm đột ngột hơn lũ miền Trung.',
  },
  {
    source: 'Lũ lụt miền Bắc Việt Nam',
    content: 'Miền Bắc Việt Nam (đồng bằng sông Hồng, Hà Nội, Hải Phòng) có nguy cơ lũ từ tháng 6–9. Rủi ro chính: vỡ đê sông Hồng và sông Thái Bình. Lũ quét ở các tỉnh miền núi phía Bắc (Lào Cai, Yên Bái, Hà Giang) xảy ra đột ngột và rất nguy hiểm. Hệ thống đê điều bảo vệ vùng đồng bằng nhưng cần theo dõi mực nước thường xuyên trong mùa mưa bão.',
  },
  {
    source: 'Bão nhiệt đới và lũ lụt',
    content: 'Bão nhiệt đới là nguyên nhân chính gây lũ nghiêm trọng tại Việt Nam. Khi bão đổ bộ, lượng mưa có thể đạt 200–500mm trong 24 giờ, gây lũ đột ngột trên diện rộng. Mùa bão chính: tháng 6–11, bão mạnh nhất thường vào tháng 9–10. Ảnh hưởng nhiều nhất: dải ven biển từ Quảng Ninh đến Cà Mau. Hệ thống VNFlood tích hợp dữ liệu IBTrACS theo dõi bão hoạt động gần Việt Nam.',
  },
  {
    source: 'Số điện thoại khẩn cấp',
    content: 'Số điện thoại khẩn cấp khi có lũ tại Việt Nam: 113 (Cảnh sát), 114 (Cứu hỏa), 115 (Cấp cứu y tế), 1800 1560 (Đường dây nóng phòng chống thiên tai — miễn phí 24/7). Ứng dụng VNFlood có tính năng SOS để gửi yêu cầu cứu hộ kèm vị trí GPS đến lực lượng ứng cứu gần nhất.',
  },
];
