// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract InterestRateStrategy {

    uint256 public baseRate;        
        uint256 public slope1;           
        uint256 public slope2;             
        uint256 public optimalUtilisation; 

    constructor(
        uint256 _baseRate,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _optimalUtilisation
    ) {
        baseRate = _baseRate;
        slope1 = _slope1;
        slope2 = _slope2;
        optimalUtilisation = _optimalUtilisation;
    }


    function calculateUtilisation(
        uint256 totalBorrowed, 
        uint256 totalDeposited
    ) public pure returns (uint256) {
        require(totalDeposited > 0, "Total deposited must be greater than zero");
        return(totalBorrowed * 10000) / totalDeposited; // basis points
        
    }

    function calculateBorrowRate(uint256 totalBorrowed, uint256 totalDeposited) public view returns (uint256) {

        uint256 utilisation = calculateUtilisation(totalBorrowed, totalDeposited);

        if (utilisation < optimalUtilisation) {
            return baseRate + (utilisation * slope1) / 10000;
        } else {
            uint256 excessUtilisation = utilisation - optimalUtilisation;
            return baseRate + slope1 + (excessUtilisation * slope2) / 10000;
        }

    }
}