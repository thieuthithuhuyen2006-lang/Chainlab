import streamlit as st
import streamlit.components.v1 as components

# 1. Cấu hình trang Streamlit full chiều rộng
st.set_page_config(
    page_title="CHAINLAB - HUB BLOCKCHAIN LAB",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 2. Xóa sạch viền padding, header và footer dư thừa của Streamlit
st.markdown("""
    <style>
        .block-container {
            padding-top: 0rem !important;
            padding-bottom: 0rem !important;
            padding-left: 0rem !important;
            padding-right: 0rem !important;
            max-width: 100% !important;
        }
        header {visibility: hidden;}
        footer {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

# 3. Hiển thị trực tiếp Web React (Port 5173 hoặc link Localtunnel)
REACT_URL = "http://localhost:5173"

components.iframe(REACT_URL, height=1000, scrolling=True)