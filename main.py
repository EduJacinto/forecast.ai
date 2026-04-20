from flask import Flask, render_template, request, jsonify
from LSTM import train, predict_next_n_days, get_historical_data

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/predict", methods=["POST"])
def predict():
    '''
    this will expect json from the yfinance API
    '''
    data = request.get_json()
    ticker = data.get("ticker", "").strip().upper()
    

    if not ticker:
        return jsonify({"error": "Please provide a ticker symbol."}), 400

    try:
        model, scaler, df = train(ticker, epochs=20)
        forecast_prices = predict_next_n_days(model, scaler, df, n_days=30)
        historical = get_historical_data(df, days=90)

        import pandas as pd
        last_date = df.index[-1]
        future_dates = pd.bdate_range(start=last_date + pd.Timedelta(days=1), periods=30)
        forecast = [(str(day.date()), round(price, 2)) for day, price in zip(future_dates, forecast_prices)]

        return jsonify({
            "ticker": ticker,
            "historical": historical,
            "forecast": forecast
        })
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    
    except Exception as e:
        return jsonify({"error": f"prediction failed: {str(e)}"}), 500
    

if __name__ == "__main__":
    app.run(debug=True)