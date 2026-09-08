from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pickle
import numpy as np
from pydantic import BaseModel, Field


app = FastAPI(
    title="Customer Segmentation",
    description="Identify the customer segments",
    version="1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load K-Means model
with open("model.pkl", "rb") as f:
    model = pickle.load(f)


# Load StandardScaler
with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)


# Customer input
class CustomerInput(BaseModel):
    Total_Orders: int = Field(..., gt=0)
    Avg_Order_Value: float = Field(..., gt=0)
    Total_Quantity: int = Field(..., gt=0)
    Recency: int = Field(..., ge=0)
    Total_Spending: float = Field(..., gt=0)
    Avg_Discount: float = Field(..., ge=0)


# Cluster names
cluster_names = {
    0: "Low Value Customers",
    1: "Premium Customers",
    2: "Loyal Customers",
    3: "Deal Seekers Customers",
    4: "VIP Customers"
}


# Prediction endpoint
@app.post("/predict")
def predict_customer(data: CustomerInput):

    # Log transformation
    avg_discount_log = np.log1p(data.Avg_Discount)

    # Features - same order as training
    features = [[
        data.Total_Orders,
        data.Avg_Order_Value,
        data.Total_Quantity,
        data.Recency,
        data.Total_Spending,
        avg_discount_log
    ]]

    # Scaling
    features_scaled = scaler.transform(features)

    # K-Means prediction
    cluster = int(model.predict(features_scaled)[0])

    # Get customer segment
    segment = cluster_names.get(cluster, "Unknown")

    return {
        "cluster": cluster,
        "segment": segment
    }


# IMPORTANT: this must stay at the very bottom of the file, after every
# @app route. It serves index.html at "/" and style.css / script.js
# alongside it, without shadowing the /predict route defined above.
app.mount("/", StaticFiles(directory="static", html=True), name="static")