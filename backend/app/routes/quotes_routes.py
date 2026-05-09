"""
Quotes routes — proxy endpoint for the dashboard motivational quote card.
"""
from flask import Blueprint, jsonify
from app.services.quotes_service import fetch_random_quote, QuoteUnavailableError
from app.utils.error_handler import error_response

quotes_bp = Blueprint("quotes", __name__)


@quotes_bp.route("/random", methods=["GET"])
def random_quote():
    try:
        return jsonify(fetch_random_quote()), 200
    except QuoteUnavailableError as exc:
        return error_response(str(exc), 503)
