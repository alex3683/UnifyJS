/*
 * Copyright (c) 2011, Alexander Wilden
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. All advertising materials mentioning features or use of this software
 *    must display the following acknowledgement:
 *    This product includes software developed by Alexander Wilden.
 * 4. Neither the name Alexander Wilden nor the
 *    names of its contributors may be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var Unify = (function() {

   var slice = Array.prototype.slice;
   var CALLBACK = {};
   
   function Chainer(args) {
      this.invocations = [];
      this.callback = null;
      this.invoked = false;
      if (args) {
         this.add.apply(this, args);
      }
   };
   
   Chainer.prototype.add = function(asyncCallback /*, varargs*/) {
      if (typeof(asyncCallback) !== "function") {
         throw "You need to pass at least one asynchronous method";
      }
      
      var callbackPositions = [];
      var args = Array.prototype.slice.call(arguments, 1);
      for (var i = 0; i < args.length; ++i) {
         var arg = args[i];
         if (arg === CALLBACK) {
            callbackPositions.push(i);
         }
         else if (isPlainObject(arg)) {
            var argSpec = null;
            for (var key in arg) {
               if (arg[key] === CALLBACK) {
                  argSpec = argSpec === null ? {
                     'index': i,
					 'keys': []
                  } : argSpec;
                  argSpec.keys.push(key);
               }
            }
            if (argSpec !== null) {
               callbackPositions.push(argSpec);
            }
         }
      }
      
      if (callbackPositions.length < 1) {
         throw "There needs to be at least one callback parameter in the asynchronous function";
      }
      
      this.invocations.push({
         func: asyncCallback,
         args: args,
         callbackPositions: callbackPositions
      });
      
      return this;
   };
   
   Chainer.prototype.invoke = function(callback) {
      if (this.invoked) {
         throw "Unified functions can only be invoked once";
      }
      if (typeof(callback) !== "function") {
         throw "You need to pass a function to Unify#invoke()";
      }
      this.invoked = true;
      
      var collectedResults = [];
      var invocationsToMake = this.invocations.length;
      var callbackFunction = function(resultIndex) {
         return function(/*varargs*/) {
            collectedResults[resultIndex] = slice.call(arguments);
            if (--invocationsToMake == 0) {
               callback(collectedResults);
            }
         };
      }
      
      for (var i = 0; i < this.invocations.length; ++i) {
         var invocation = this.invocations[i];
         var callbackPositions = invocation.callbackPositions;
         var args = invocation.args;
         for (var j = 0; j < callbackPositions.length; ++j) {
            var callbackPosition = callbackPositions[j];
			
            if (isPlainObject(callbackPosition)) {
               var argObject = args[callbackPosition.index];
               var keys = callbackPosition.keys;
               for (var k = 0; k < keys.length; ++k) {
                  argObject[keys[k]] = callbackFunction(i);
               }
            }
            else {
               args[callbackPosition] = callbackFunction(i);
            }
         }
         invocation.func.apply({}, args);
      }
   };
   
   function isPlainObject(obj) {
      return (Object.prototype.toString.call(obj) === '[object Object]');
   }
   
   return {
   
      CALLBACK: CALLBACK,
      
      add: function(asyncCallback /*, varargs*/) {
         return new Chainer(slice.apply(arguments));
      },
      
      create: function() {
         return new Chainer();
      }
      
   };
   
})();
