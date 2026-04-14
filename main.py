from flask import Flask, render_template, request, jsonify
# from LSTM import train, predict_next_n_days, get_historical_prices, fetch_stock_data

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
        return ValueError("Error: Please provide a ticker symbol.");

    try:
        pass
    
    except ValueError as e:
        pass
    
    except Exception as e:
        pass
    

if __name__ == "__main__":
    app.run(debug=True)