window.dictionary = window.dictionary || {};
(function(dictionary) {
    dictionary.vi = {
        // App Description
        app_title: "Ứng Dụng Tính Toán AVI"
        ,app_desc1: "Quý vị có thể sử dụng ứng dụng này để ước tính thuế bất động sản của quý vị theo Chương Trình Giá Trị Thực Tế (AVI)."
        ,app_desc2: "Chương Trình Giá Trị Thực Tế, hay AVI, là một chương trình tái đánh giá tất cả các bất động sản trong thành phố để đảm bảo rằng giá trị là công bằng và chính xác. Nó cũng cung cấp một hệ thống thuế dễ hiểu hơn bằng cách loại bỏ các phân số phức tạp khi tính hóa đơn thuế."
        ,multiple_properties_found: "Nhiều Bất Động Sản Được Tìm Thấy"
        
        // Forms
        ,address: "Địa chỉ"
        ,address_example: "ví dụ 908 N 3rd St"
        ,account: "# tài khoản"
        ,account_example: "ví dụ 883525510"
        
        // Buttons
        ,search_button: "Tìm kiếm"
        ,select_option: "Chọn"
        ,estimate_button: "Ước tính"
        ,new_search_button: "Tìm Kiếm Mới"
        ,more_button: "Thêm"
        ,try_again_button: "Thử Lại"
        
        // Value Fields
        ,previous_value: "Giá Trị Trước Đó"
        ,new_value: "Giá Trị Mới"
        ,market_value: "Giá Trị Thị Trường"
        ,land_value: "Giá Trị Đất"
        ,improvement_value: "Giá Trị Cải Thiện"
        ,exempt_value: "Giá Trị Giảm/Miễn"
        ,tax_2013: "Thuế 2013"
        
        // Estimation Fields
        ,estimate_2014_tax: "Ước Tính Thuế Năm 2014"
        ,tax_desc: "Để tạo ra cùng một số lượng doanh thu năm tới như được ước tính cho năm nay, thuế suất tối thiểu 1,25% là cần thiết mà không có bất kỳ biện pháp cứu trợ nào. Với chương trình miễn thuế nhà $15.000, tối thiểu 1,3204% là cần thiết."
        ,homestead_exemption: "Miễn Thuế Nhà"
        ,no_homestead: "Không Phải Nhà Cửa"
        ,taxable_market_value: "Giá Trị Thị Trường Chịu Thuế"
        ,tax_rate: "Thuế Suất"
        ,estimated_2014_tax: "Thuế Ước Tính Năm 2014"
        
        // Property Info
        ,unit: "Đơn vị"
        ,property_info: "Thông Tin Bất Động Sản"
        ,owners: "(Các) chủ sở hữu"
        ,zip: "Mã Zip"
        ,sale_date: "Ngày Bán"
        ,sale_price: "Giá Bán"
        ,homestead: "Nhà Cửa"
        ,land_area: "Diện tích đất"
        ,improvement_area: "Khu Vực Cải Thiện"
        ,beginning_point: "Điểm Khởi Đầu"
        ,ext_condition: "Điều Kiện Ngoại Thất"
        ,zoning: "Phân khu"
        
        // Disclaimers
        ,disclaimer_rates: "Các thuế suất này được sử dụng chỉ cho các mục đích ước tính và không phải là các thuế suất được đề xuất hoặc cuối cùng."
        ,disclaimer_learn: "Để tìm hiểu thêm về AVI, vui lòng ghé thăm <a href=\"http://www.phila.gov/opa\" target=\"_blank\">www.phila.gov/opa</a>"
        ,disclaimer_appeal: "Nếu cho rằng giá trị mới của quý vị không phản ánh giá trị có thể bán trên thị trường, quý vị có thể nộp đơn xin xem xét không chính thức với OPA và/hoặc kháng cáo tới BRT."
        ,disclaimer_sale_price: "Giá bán được hiển thị có thể phản ánh việc bán nhiều bất động sản, và không nhất thiết là chỉ số duy nhất của giá trị thị trường hiện tại."
        
        // Errors
        ,error: "Lỗi"
        ,error_being_updated: "Dữ liệu cho bất động sản này đang được cập nhật. Xin vui lòng kiểm tra lại sau."
        ,error_no_matches: "Không có kết quả phù hợp được tìm thấy cho <code>%s</code>."
        ,error_best_results: "Để có các kết quả tốt nhất, hãy thử nhập số tài khoản của bất động sản của quý vị."
        ,error_should_have_worked: "Nếu nghĩ rằng điều này có hiệu quả, quý vị có thể thử tìm kiếm tại <a href=\"http://opa.phila.gov/opa.apps/Search/SearchForm.aspx?url=search\" target=\"_blank\">www.phila.gov/opa</a>"
        ,error_database: "Lỗi xảy ra trong khi tìm kiếm bất động sản trong cơ sở dữ liệu. Xin vui lòng thử lại."
        ,error_verifying: "Lỗi xảy ra trong khi xác nhận địa chỉ. Xin vui lòng thử lại."
        ,error_generic: "Có lỗi đã xảy ra. Xin vui lòng thử lại."
        ,error_addendum: "Quý vị cũng có thể thử tìm kiếm tại <a href=\"http://opa.phila.gov/opa.apps/Search/SearchForm.aspx?url=search\" target=\"_blank\">www.phila.gov/opa</a>"
        
        // Property Conditions
        ,cond_0: "Không Áp Dụng"
        ,cond_1: "1"
        ,cond_2: "Mới / Được Sửa Chữa Lại"
        ,cond_3: "Trên Trung Bình"
        ,cond_4: "Trung Bình"
        ,cond_5: "Dưới Trung Bình"
        ,cond_6: "Bỏ không"
        ,cond_7: "Niêm Kín / Phù Hợp Với Kết Cấu"
        
        // Navigation
        ,nav_homepage: "Ghé Thăm Trang Chủ của Thành Phố"
        ,nav_topics: "Các chủ đề"
        ,nav_people: "Chúng Tôi Phục Vụ Ai"
        ,nav_government: "Chính phủ"
        ,nav_311: "Liên hệ 311"
    };
})(window.dictionary);