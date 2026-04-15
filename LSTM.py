import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from keras import Sequential
from keras.layers import LSTM, Dense, Dropout
import yfinance as yf

# this model will focus on medium term patterns/trends to avoid looking at noise and stale data
SEQUENCE_LENGTH=60

def fetch_ticker_data(ticker: str, period: str = "2yr") -> pd.DataFrame:
    '''
    will be looking at closing prices for each day
    '''

    df = yf.download(ticker, period=period, progress=False)
    if df.empty:
        raise ValueError(f"No data found for ticker provided: {ticker}")
    return df[["Close"]]

def preprocess(df: pd.DataFrame):
    '''
    Scale data, build X,y sequences
    '''
    scaler = MinMaxScaler(feature_range=(0,1)) # try 0 1 first, then -1 1
    scaled = scaler.fit_transform(df.values)

    X, y = [], []

    for i in range(SEQUENCE_LENGTH, len(scaled)):
        X.append(scaled[i - SEQUENCE_LENGTH:i, 0])
        y.append(scaled[i, 0])

    X = np.array(X).reshape(-1, SEQUENCE_LENGTH, 1)
    y = np.array(y)

    return X, y, scaler

def build_model() -> Sequential:
    """
    this method creates and compiles the LSTM model
    """
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, 1)),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(1),
    ])
    model.compile(optimizer="adam", loss="mean_squared_error")
    return model

def train(ticker: str, epochs: int = 20, batch_size: int = 32):
    '''
    get the data, train model, return all needed to predict price
    '''

    df = fetch_ticker_data(ticker)
    X, y, scaler = preprocess(df)

    # split data for training and testing
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = build_model()

    model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=(X_test, y_test),
        verbose=0
    )

    return model, scaler, df

def predict_next_n_days(model, scaler, df: pd.DataFrame, n_days: int = 30):
    '''
    forecast the trained model to forecast the closing price of the next n days.
    returns a list of predicted prices (floats)
    '''

    scaled = scaler.transform(df.values)
    window = scaled[-SEQUENCE_LENGTH:].reshape(1, SEQUENCE_LENGTH, 1)

    predictions = []

    for i in range(n_days):
        scaled_prediction = model.predict(window, verbose=0)[0,0]
        predictions.append(scaled_prediction)
        window = np.append(window[:, 1:, :], [[[scaled_prediction]]], axis=1)

    predictions = scaler.inverse_transform(np.array(predictions).reshaped(-1,1))
    return predictions.flatten().tolist()

def get_historical_data(df: pd.DataFrame, days: int = 90):
    '''
    returns the last 'days' rows as a list of (date_str, closing_price) tuples.
    '''
    recent = df.tail(days)
    return [(str(day.date()), float(price)) for day, price in zip(recent.index, recent["Close"])]
